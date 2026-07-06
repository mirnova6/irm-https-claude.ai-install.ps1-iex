/* ============================================================
   CaseCompass — clinical drafting engine
   Local, deterministic template + rule engine. Composes drafts
   from the clinician's own structured inputs and the reference
   libraries in data.js. Every artifact is labeled a draft for
   licensed-clinician review. Optional Claude API polish lives at
   the bottom (off by default; explicit warning before any PHI
   leaves the device).
   ============================================================ */
'use strict';

(function () {
  const CC = window.CC;
  const E = CC.engine = {};

  /* ---------------- helpers ---------------- */
  const j = (arr, sep) => arr.filter(Boolean).join(sep ?? ' ');
  const sentence = (s) => { s = (s || '').trim(); if (!s) return ''; return /[.!?]$/.test(s) ? s : s + '.'; };
  const lc1 = (s) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const listAnd = (arr) => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  const who = (c) => c.initials || 'Client';

  E.profileText = (c, key) => (c.profile?.[key]?.text || '').trim();

  E.activeDx = (c) => (c.diagnoses || []).filter(d => d.status !== 'ruled-out').map(d => d.label + (d.status === 'impression' ? ' (provisional impression)' : ''));

  E.latestScore = (c, tool) => {
    const rows = (c.assessments || []).filter(a => a.tool === tool).sort((a, b) => a.date < b.date ? -1 : 1);
    return rows[rows.length - 1] || null;
  };

  E.interpretScore = (tool, score) => {
    const def = CC.ASSESSMENTS.find(a => a.key === tool);
    if (!def) return null;
    const band = def.bands.find(b => score >= b.min && score <= b.max) || def.bands[def.bands.length - 1];
    return { def, band };
  };

  /* ---------------- risk scanner ---------------- */
  E.scanRisk = (text) => {
    const flags = [];
    for (const p of CC.RISK_PATTERNS) {
      if (p.re.test(text || '')) flags.push({ kind: p.kind, flag: p.flag, reminder: CC.RISK_REMINDERS[p.kind] });
    }
    return flags;
  };

  /* ============================================================
     DAP NOTE GENERATOR
     inputs: { raw, mood, affect, engagement, quotes, interventions,
               progress, risk, homework, impressions, sessionDate }
     style: key from CC.DAP_STYLES
     ============================================================ */
  E.generateDAP = (client, inputs, styleKey) => {
    const c = client, name = who(c);
    const style = styleKey || 'standard';
    const brief = style === 'brief';
    const detailed = style === 'detailed';
    const riskFlags = E.scanRisk(j([inputs.raw, inputs.risk, inputs.quotes, inputs.impressions], ' '));
    const themes = (c.themes || []).slice(0, 3);
    const goals = (c.goals || []).filter(g => g.status === 'active');

    /* ---- DATA ---- */
    const d = [];
    d.push(sentence(`${name} attended a ${c.levelOfCare ? lc1(c.levelOfCare) + ' ' : ''}individual therapy session${inputs.sessionDate ? ' on ' + inputs.sessionDate : ''}`));
    if (inputs.mood || inputs.affect) d.push(sentence(j([
      inputs.mood ? `Client described mood as "${inputs.mood}"` : '',
      inputs.affect ? `observed affect was ${lc1(inputs.affect)}` : '',
    ], '; ')));
    if (inputs.engagement) d.push(sentence(`Client presented as ${lc1(inputs.engagement)}`));
    if (inputs.raw) {
      d.push(sentence(`Client reported: ${E.condense(inputs.raw, brief ? 2 : detailed ? 8 : 4)}`));
    }
    if (inputs.quotes) inputs.quotes.split('\n').map(q => q.trim()).filter(Boolean).forEach(q => {
      d.push(sentence(`Client stated, "${q.replace(/^["']|["']$/g, '')}"`));
    });
    if (inputs.interventions) d.push(sentence(`Interventions used this session included ${lc1(inputs.interventions)}`));
    if (!brief && themes.length) d.push(sentence(`Session themes were consistent with ongoing treatment focus areas: ${listAnd(themes.map(lc1))}`));
    if (style === 'residential') d.push(sentence('Client remains in the structured residential milieu; participation in programming and community expectations was reviewed as part of the session'));
    if (style === 'sud' && (c.substanceUse || /crav|trigger|use|sober|relapse/i.test(inputs.raw || ''))) d.push(sentence('Substance-use status, cravings, and exposure to triggers since the last session were reviewed'));

    /* ---- ASSESSMENT ---- */
    const a = [];
    const dx = E.activeDx(c);
    if (dx.length && !brief) a.push(sentence(`Presentation remains consistent with ${listAnd(dx)}`));
    if (inputs.progress) a.push(sentence(`Progress toward treatment goals: ${lc1(inputs.progress)}`));
    else if (goals.length) a.push(sentence(`Client continues to work toward active treatment goals (${goals.slice(0, 2).map(g => '"' + g.text + '"').join('; ')}); progress this session was ${inputs.engagement ? 'reflected in session engagement as described above' : 'incremental'}`));
    if (inputs.impressions) a.push(sentence(`Clinician's impressions: ${lc1(inputs.impressions)}`));
    // style-specific clinical lens
    const lens = {
      trauma: 'Client’s presentation was conceptualized through a trauma-informed lens; arousal level, window of tolerance, and use of grounding were monitored throughout, and material was titrated to maintain stabilization.',
      psychodynamic: 'Process observations: the client’s in-session relational stance (including moments of guardedness, appeasement, or withdrawal) was noted as likely mirroring characteristic defenses and object-relational patterns; these were held as hypotheses rather than interpreted directly.',
      cbtdbt: 'The cognitive-behavioral chain connecting situational triggers, automatic thoughts/urges, emotional responses, and behaviors was mapped collaboratively; skill acquisition and generalization were assessed.',
      sud: 'Relapse-risk indicators (craving intensity, exposure to cues, mood instability, and engagement with recovery supports) were assessed. Stage of change and self-efficacy for maintaining recovery goals were considered in selecting interventions.',
      insurance: 'Symptoms continue to cause functional impairment consistent with the diagnosis, supporting medical necessity for continued treatment at the current level of care. Interventions delivered were consistent with the active treatment plan and the client’s measurable objectives.',
      residential: 'Client’s functioning within the milieu, response to structure, and coordination with the multidisciplinary team were considered in evaluating progress and ongoing level-of-care fit.',
    }[style];
    if (lens) a.push(lens);
    if (c.attachmentStyle && !/Unknown/.test(c.attachmentStyle) && (detailed || style === 'psychodynamic')) {
      a.push(sentence(`Relational presentation remains consistent with a ${lc1(c.attachmentStyle)} attachment pattern, which continues to inform pacing and alliance strategy`));
    }
    // risk is always addressed
    if (riskFlags.length || inputs.risk) {
      a.push(sentence(`Risk: ${inputs.risk ? sentence(inputs.risk) : ''} ${riskFlags.length ? 'Screening of session content flagged: ' + listAnd(riskFlags.map(f => lc1(f.flag))) + '. Clinician assessed and addressed as documented' : ''}`.trim()));
    } else {
      a.push('Risk: client denied current suicidal ideation, homicidal ideation, and intent to harm self or others; no acute risk indicators were observed this session.');
    }
    if (!brief) {
      const scoreBits = ['PHQ-9', 'GAD-7', 'PCL-5'].map(t => { const s = E.latestScore(c, t); return s ? `${t} ${s.score} (${E.interpretScore(t, s.score).band.label.toLowerCase()}, ${s.date})` : null; }).filter(Boolean);
      if (scoreBits.length) a.push(sentence(`Most recent measures: ${scoreBits.join('; ')}`));
    }

    /* ---- PLAN ---- */
    const p = [];
    p.push(sentence(`Continue ${c.levelOfCare ? lc1(c.levelOfCare) + ' treatment' : 'current treatment'} per the active plan${inputs.interventions ? ', maintaining ' + lc1(inputs.interventions) : ''}`));
    if (inputs.homework) p.push(sentence(`Between-session assignment: ${lc1(inputs.homework)}`));
    if (riskFlags.length) p.push(sentence('Safety planning reviewed/updated in response to flagged content; risk to be re-assessed at next contact'));
    if (style === 'sud') p.push(sentence('Continue relapse-prevention focus: review trigger plan, recovery-support contact, and craving-management skills next session'));
    if (style === 'trauma') p.push(sentence('Continue stabilization and resource-building; process trauma material only within the window of tolerance'));
    if (style === 'insurance') p.push(sentence('Continue to monitor symptom severity with standardized measures; treatment remains medically necessary to reduce symptoms and restore functioning'));
    const nextFocus = inputs.nextFocus || (goals[0] ? `progress on "${goals[0].text}"` : 'themes identified above');
    p.push(sentence(`Next session will focus on ${lc1(nextFocus)}`));
    p.push(sentence('Next appointment scheduled per standing cadence'));

    return {
      data: d.join(' '),
      assessment: a.join(' '),
      plan: p.join(' '),
      riskFlags,
      style,
    };
  };

  /* crude extractive condenser: keeps the first N informative lines/sentences */
  E.condense = (raw, n) => {
    const parts = raw.split(/\n+|(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 2);
    const keep = parts.slice(0, n);
    let out = keep.map(s => s.replace(/^[-*•]\s*/, '')).join('; ');
    if (parts.length > n) out += '; additional detail retained in session inputs';
    return lc1(out);
  };

  /* ============================================================
     MASTER TREATMENT PLAN GENERATOR
     ============================================================ */
  E.generateTreatmentPlan = (client) => {
    const c = client, name = who(c);
    const dx = E.activeDx(c);
    const tags = CC.dxTags(c);
    const pf = (k) => E.profileText(c, k);

    /* ---- A. Holistic clinical identity formulation ---- */
    const idBits = [];
    idBits.push(`${name} presents as an individual whose current difficulties are best understood developmentally rather than as isolated symptoms — the guiding question of this formulation is what happened to this person, how they adapted to survive it, and what that adaptation now costs them.`);
    if (pf('presenting') || c.presentingProblem) idBits.push(sentence(`The presenting picture centers on ${lc1(pf('presenting') || c.presentingProblem)}`));
    if (pf('trauma') || (c.traumaThemes || []).length) idBits.push(sentence(`Historical material includes ${lc1(pf('trauma') || listAnd(c.traumaThemes))}, which appears to have shaped core expectations of self and others`));
    if (pf('coreBeliefs') || pf('coreFears')) idBits.push(sentence(`Core beliefs and fears — ${lc1(j([pf('coreBeliefs'), pf('coreFears')], '; '))} — are hypothesized to operate as organizing schemas beneath the presenting symptoms`));
    if (c.attachmentStyle && !/Unknown/.test(c.attachmentStyle)) idBits.push(sentence(`Relationally, the client presents with features of a ${lc1(c.attachmentStyle)} attachment pattern${pf('attachment') ? ': ' + lc1(pf('attachment')) : ''}`));
    if (pf('defenses') || pf('regulation')) idBits.push(sentence(`Characteristic coping adaptations include ${lc1(j([pf('defenses'), pf('regulation')], '; '))} — adaptations that were protective in their original context and are now maintaining distress and functional cost`));
    if (pf('substance') || c.substanceUse) idBits.push(sentence(`Substance use appears to serve an identifiable regulatory function (${lc1(pf('substance') || c.substanceUse)}), and is therefore addressed in this plan as both a risk domain and a coping adaptation to be replaced rather than merely removed`));
    if (pf('strengths')) idBits.push(sentence(`The plan is built on documented strengths: ${lc1(pf('strengths'))}`));
    idBits.push('This formulation is a working hypothesis for clinician review and will be revised as new information emerges.');

    /* ---- B. Hierarchy of needs ---- */
    const hier = [];
    const add = (label, why) => hier.push({ label, why });
    if (c.riskLevel === 'acute' || c.riskLevel === 'high') add('Safety and stabilization', `Current risk level is ${c.riskLevel}; stabilization precedes all other work.`);
    if ((c.riskFactors || []).some(r => /si|suicid|self.harm/i.test(r)) || E.latestScore(c, 'C-SSRS')) add('Suicidal ideation / self-harm risk', 'Documented ideation or risk factors require active monitoring, safety planning, and means-restriction counseling.');
    if (tags.has('sud') || c.substanceUse) add('Substance-use risk and relapse prevention', 'Active or recent substance use is a destabilizer of every other treatment target.');
    if (tags.has('ptsd') || (c.traumaThemes || []).length) add('Trauma symptoms (stabilization first)', 'Trauma-driven arousal and intrusion symptoms require phase-oriented care before processing work.');
    if (pf('regulation')) add('Emotional regulation', 'Documented regulation difficulties limit the usability of insight-oriented gains.');
    if (tags.has('depression') || tags.has('anxiety')) add('Depression / anxiety symptom reduction', 'Primary mood/anxiety symptoms drive functional impairment and subjective distress.');
    if (!/Unknown/.test(c.attachmentStyle || '') || pf('relational')) add('Attachment and relational patterns', 'Relational patterns both maintain symptoms and are the medium through which therapy works.');
    if (pf('shame')) add('Shame and identity wounds', 'Shame sensitivity mediates engagement, disclosure, and relapse risk.');
    add('Coping skills consolidation', 'A shared, rehearsed toolkit supports every phase of this plan.');
    add('Long-term meaning, values, and life direction', 'Sustained recovery requires a life worth staying well for; values work anchors maintenance.');

    /* ---- C. Evidenced-by ---- */
    const ev = [];
    if (dx.length) ev.push(`diagnostic impressions of ${listAnd(dx)}`);
    const scoreBits = CC.ASSESSMENTS.map(t => { const s = E.latestScore(c, t.key); return s ? `${t.key} of ${s.score} (${E.interpretScore(t.key, s.score).band.label.toLowerCase()}, ${s.date})` : null; }).filter(Boolean);
    if (scoreBits.length) ev.push(`standardized measures including ${listAnd(scoreBits)}`);
    if (pf('symptoms')) ev.push(`reported symptoms of ${lc1(pf('symptoms'))}`);
    if (pf('presenting') || c.presentingProblem) ev.push(`the client's own account of ${lc1(pf('presenting') || c.presentingProblem)}`);
    if ((c.riskFactors || []).length) ev.push(`identified risk factors (${listAnd(c.riskFactors.map(lc1))})`);
    if ((c.protectiveFactors || []).length) ev.push(`protective factors (${listAnd(c.protectiveFactors.map(lc1))})`);
    if (pf('trauma')) ev.push('documented trauma history');
    if (pf('substance') || c.substanceUse) ev.push('documented substance-use patterns and their functional role');
    if (pf('relational')) ev.push('observed and reported relational difficulties');
    if ((c.medications || []).filter(m => m.active !== false).length) ev.push(`current medications (${listAnd(c.medications.filter(m => m.active !== false).map(m => m.name))})`);
    const evidence = `The clinical picture and plan are evidenced by ${listAnd(ev.length ? ev : ['clinician assessment and client self-report'])}. Behavioral observations across sessions and biopsychosocial information corroborate functional impairment in the domains identified above, supporting the medical necessity of the interventions selected. This section should be reviewed against the chart and edited by the treating clinician.`;

    /* ---- D. Goal plan ---- */
    const stGoals = [];
    if (hier.some(h => /Safety|Suicidal/.test(h.label))) stGoals.push('safety and stabilization with an active, rehearsed safety plan');
    if (tags.has('sud')) stGoals.push('early relapse-prevention structure (trigger map, support contacts, craving skills)');
    stGoals.push('symptom reduction and improved daily structure', 'emotional-regulation and coping-skill acquisition', 'psychoeducation and a strong working alliance');
    const ltGoals = [];
    if (tags.has('ptsd') || (c.traumaThemes || []).length) ltGoals.push('trauma processing once stabilization criteria are met');
    ltGoals.push('healthier relational patterns and boundary capacity');
    if (pf('shame')) ltGoals.push('shame reduction and a more stable, compassionate identity narrative');
    if (tags.has('sud')) ltGoals.push('durable relapse prevention integrated with identity and lifestyle change');
    ltGoals.push('values-based living with improved role functioning and self-worth');
    const goalPlan = `In the short term, treatment will prioritize ${listAnd(stGoals)}. Longer-term work will target ${listAnd(ltGoals)}. Goal sequencing is deliberately phase-oriented: stabilization and skills precede depth work, and gains at each phase are consolidated before demand increases. Goals will be reviewed with the client at regular intervals and revised collaboratively.`;

    /* ---- E. Objectives & plans (4–5, tailored) ---- */
    const objectives = [];
    const pushObj = (objective, plan) => { if (objectives.length < 5) objectives.push({ objective, plan }); };
    if (c.riskLevel === 'high' || c.riskLevel === 'acute' || (c.riskFactors || []).some(r => /si|suicid/i.test(r))) {
      pushObj(
        `${name} will collaboratively complete and rehearse a written safety plan, and will name warning signs and the first two coping steps from memory, within 2 weeks.`,
        'Therapist will use Stanley–Brown safety planning, means-restriction counseling, and brief risk re-assessment each session (C-SSRS as indicated), with crisis resources reviewed and documented.');
    }
    if (tags.has('sud') || c.substanceUse) {
      pushObj(
        `${name} will identify at least 3 personal relapse triggers and 3 matched coping strategies, and will use at least one strategy during a real craving episode, within 2–4 weeks.`,
        'Therapist will use motivational interviewing, relapse-prevention mapping, craving-surfing/urge-delay skills, psychoeducation on the abstinence-violation effect, and weekly review of triggers and use events to increase awareness and reduce relapse risk.');
    }
    if (tags.has('ptsd') || (c.traumaThemes || []).length) {
      pushObj(
        `${name} will demonstrate at least 3 grounding techniques and use them to return to a regulated state within 10 minutes of activation, as tracked in session and by self-report, within 6 weeks.`,
        'Therapist will provide phase-1 trauma-informed stabilization: psychoeducation (window of tolerance), a personalized grounding menu, somatic regulation practice in session, and titrated exposure to activating material only within tolerance.');
    }
    if (tags.has('depression')) {
      pushObj(
        `${name} will complete at least 3 scheduled values-linked activities per week and record mood/mastery ratings, with PHQ-9 reduction of ≥5 points within 8 weeks.`,
        'Therapist will use behavioral activation (activity scheduling, avoidance if-then planning, mastery/pleasure review) supplemented by cognitive restructuring of identified negative automatic thoughts.');
    }
    if (tags.has('anxiety') && objectives.length < 5) {
      pushObj(
        `${name} will build an exposure/experiment hierarchy and complete at least 4 planned steps, with GAD-7 reduction of ≥4 points within 8 weeks.`,
        'Therapist will use CBT psychoeducation on the avoidance loop, collaborative hierarchy construction, graded behavioral experiments, and relapse-prevention consolidation.');
    }
    if (pf('regulation') && objectives.length < 5) {
      pushObj(
        `${name} will identify emotions at or below 5/10 intensity and apply a chosen regulation skill in at least 2 real situations per week, within 6 weeks.`,
        'Therapist will provide emotion-regulation training (feelings vocabulary, body-cue mapping, intensity scaling, opposite action) with in-session rehearsal and between-session tracking.');
    }
    if (pf('relational') || !/Unknown/.test(c.attachmentStyle || '')) {
      pushObj(
        `${name} will practice direct need-expression or boundary-setting in at least 2 identified relationships and process the outcomes in session, within 8 weeks.`,
        'Therapist will use attachment-informed relational work, boundary scripts with rehearsal, interpersonal-effectiveness skills (DEAR MAN/GIVE/FAST), and explicit rupture-repair within the therapeutic relationship as live practice.');
    }
    if (pf('shame') && objectives.length < 5) {
      pushObj(
        `${name} will map personal shame triggers and armor behaviors and will share at least one previously avoided narrative in session, within 10 weeks.`,
        'Therapist will use shame-resilience work (shame vs guilt psychoeducation, titrated disclosure met with attunement, self-compassion practices) paced to alliance strength.');
    }
    if (objectives.length < 4) {
      pushObj(
        `${name} will articulate 3 core personal values and complete one committed action per value domain, within 8 weeks.`,
        'Therapist will use ACT-consistent values clarification (card sort, values vs goals distinction) and committed-action planning sized to current willingness.');
      pushObj(
        `${name} will build and use a personalized coping-skills menu (minimum 5 rehearsed skills matched to high- and low-arousal states) within 4 weeks.`,
        'Therapist will deliver coping-skills training with in-session rehearsal, state-matching guidance, and weekly effectiveness review.');
    }

    return {
      identity: idBits.join(' '),
      hierarchy: hier,
      evidence,
      goalPlan,
      objectives: objectives.slice(0, 5),
    };
  };

  /* ============================================================
     FORMULATION DRAFTING + UPDATE RATIONALE
     ============================================================ */
  E.generateFormulation = (client) => {
    const c = client, pf = (k) => E.profileText(c, k);
    const dx = E.activeDx(c);
    const bits = [];
    bits.push(`${who(c)} presents with ${lc1(c.presentingProblem || pf('presenting') || 'the concerns documented in the record')}${dx.length ? ', in the context of ' + listAnd(dx.map(lc1)) : ''}.`);
    if (pf('development') || pf('family') || pf('trauma')) bits.push(sentence(`Predisposing factors include ${lc1(j([pf('trauma'), pf('development'), pf('family')].filter(Boolean).slice(0, 2), '; '))}`));
    if (pf('timeline')) bits.push(sentence(`Precipitating context: ${lc1(pf('timeline'))}`));
    const perp = j([pf('defenses'), pf('regulation'), pf('substance') || c.substanceUse, pf('secondaryGains')].filter(Boolean).slice(0, 3), '; ');
    if (perp) bits.push(sentence(`The picture appears perpetuated by ${lc1(perp)} — adaptations understood here as survival strategies that now carry functional cost`));
    if (!/Unknown/.test(c.attachmentStyle || '')) bits.push(sentence(`Attachment presentation is ${lc1(c.attachmentStyle)}${pf('attachment') ? ' (' + lc1(pf('attachment')) + ')' : ''}, which informs both the hypothesized origin of relational symptoms and the alliance strategy`));
    if (pf('strengths') || (c.protectiveFactors || []).length) bits.push(sentence(`Protective factors and strengths — ${lc1(pf('strengths') || listAnd(c.protectiveFactors))} — are treated as active ingredients of the plan`));
    bits.push('This formulation is a hypothesis for clinician review, to be tested against new session data and revised with documented rationale.');
    return bits.join(' ');
  };

  E.updateRationale = (client, newInfo) => {
    const bits = ['Formulation revised in light of new clinical information'];
    if (newInfo) bits.push(`: ${lc1(sentence(newInfo)).replace(/\.$/, '')}`);
    bits.push('. Prior version preserved in change history; differences reflect updated hypotheses, not replacement of the clinical record.');
    return bits.join('');
  };

  /* ============================================================
     INTERVENTION MATCHING
     ============================================================ */
  E.recommendInterventions = (client) => {
    const c = client, tags = CC.dxTags(c), pf = (k) => E.profileText(c, k);
    const attach = /anxious/i.test(c.attachmentStyle || '') ? 'anxious' : /avoidant.*dismis|dismis/i.test(c.attachmentStyle || '') ? 'avoidant' : /disorganized|fearful/i.test(c.attachmentStyle || '') ? 'disorganized' : null;
    const scored = CC.INTERVENTIONS.map(iv => {
      let score = 0; const why = [];
      (iv.tags.dx || []).forEach(t => { if (tags.has(t)) { score += 3; why.push(`diagnostic picture includes ${t === 'sud' ? 'substance use' : t}`); } });
      if (attach && (iv.tags.attach || []).includes(attach)) { score += 2; why.push(`${attach} attachment presentation`); }
      if (c.motivationStage && (iv.tags.stage || []).includes(c.motivationStage)) { score += 2; why.push(`current stage of change (${lc1(c.motivationStage)})`); }
      const needs = iv.tags.needs || [];
      if (needs.includes('stabilization') && (c.riskLevel === 'high' || c.riskLevel === 'acute')) { score += 3; why.push('elevated risk level calls for stabilization-first work'); }
      if (needs.includes('risk') && c.riskLevel !== 'low') { score += 3; why.push(`risk level is ${c.riskLevel}`); }
      if (needs.includes('shame') && pf('shame')) { score += 2; why.push('documented shame themes'); }
      if (needs.includes('regulation') && pf('regulation')) { score += 2; why.push('documented regulation difficulties'); }
      if (needs.includes('relational') && (pf('relational') || attach)) { score += 1; why.push('relational patterns are a treatment focus'); }
      if (needs.includes('grief') && /grief|loss|died|death|estrange/i.test(j([pf('presenting'), pf('timeline'), c.presentingProblem]))) { score += 3; why.push('grief/loss material present'); }
      if (needs.includes('meaning') && /Maintenance|Action/.test(c.motivationStage || '')) { score += 1; why.push('post-stabilization phase suits meaning work'); }
      if (needs.includes('engagement')) score += 1;
      return { iv, score, why };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, 8);
  };

  /* ============================================================
     SAFETY / TRUST / RAPPORT STRATEGY
     ============================================================ */
  E.generateSafetyStrategy = (client) => {
    const c = client, pf = (k) => E.profileText(c, k);
    const styleKey = Object.keys(CC.RAPPORT_BY_ATTACHMENT).find(k => k === c.attachmentStyle) || 'Unknown / assessing';
    const R = CC.RAPPORT_BY_ATTACHMENT[styleKey];
    const S = [];
    S.push({ h: 'How to speak to this client', t: R.speak });
    S.push({ h: 'Tone', t: `Match tone to the active attachment strategy (${lc1(styleKey)}).${pf('cultural') ? ' Cultural context to hold: ' + lc1(sentence(pf('cultural'))) : ''}` });
    S.push({ h: 'What may make them feel unsafe', t: j([R.unsafe, pf('triggers') ? `Client-specific triggers on file: ${lc1(sentence(pf('triggers')))}` : ''], ' ') });
    S.push({ h: 'Validation they need', t: j([R.validation, pf('shame') ? `Shame map suggests validating around: ${lc1(sentence(pf('shame')))}` : ''], ' ') });
    S.push({ h: 'Confrontation they can tolerate', t: R.confrontation });
    S.push({ h: 'Pacing', t: j([R.pace, (c.riskLevel === 'high' || c.riskLevel === 'acute') ? 'Current risk level shortens the leash on depth work: stabilization content takes precedence until risk settles.' : ''], ' ') });
    S.push({ h: 'Repairing ruptures', t: R.repair });
    S.push({ h: 'Building alliance', t: j([
      'Reliability is the intervention: same structure, honest limits, follow-through on small promises.',
      pf('therapyClues') ? `In-session relational clues on file: ${lc1(sentence(pf('therapyClues')))} — treat these as live data about their outside relationships.` : '',
      pf('substance') || c.substanceUse ? 'Where substance use is present, treat honesty about use as the alliance metric — respond to disclosures with curiosity, never punishment, or reporting accuracy will collapse.' : '',
    ], ' ') });
    S.push({ h: 'What to avoid saying', t: R.avoidSaying });
    S.push({ h: 'Interventions that may overwhelm', t: j([
      /disorganized|anxious/i.test(styleKey) ? 'Unstructured silence, rapid-fire questioning, and premature trauma detail.' : 'Prolonged affect-focused pressure before trust is earned.',
      pf('regulation') ? `Regulation profile (${lc1(pf('regulation'))}) suggests watching for flooding and titrating experiential work.` : '',
    ], ' ') });
    S.push({ h: 'Helping them feel respected, seen, and not judged', t: 'Name strengths as facts, not flattery; ask permission before advice; let them correct you and thank them when they do; document collaboratively where appropriate ("here’s what I’m writing down — did I get it right?").' });
    const nci = CC.store.db?.settings?.nci;
    if (nci?.enabled && nci.levels?.some(l => l.definition)) {
      S.push({ h: 'Clinician-provided profiling framework', t: 'Your custom framework (Settings → Profiling) is active. Apply its behavioral markers observationally and ethically: observable behavior → hypothesis → treatment relevance. Never use profiling for covert influence; its clinical purpose here is attunement, pacing, and safety.' });
    }
    return S;
  };

  /* ============================================================
     KNOWLEDGE BASE ANSWERING
     ============================================================ */
  E.answerKnowledge = (query, client) => {
    const q = (query || '').toLowerCase();
    const scored = CC.KNOWLEDGE.map(k => {
      let s = 0;
      k.tags.forEach(t => { if (q.includes(t)) s += 3; });
      k.title.toLowerCase().split(/\W+/).forEach(w => { if (w.length > 3 && q.includes(w)) s += 1; });
      q.split(/\W+/).forEach(w => { if (w.length > 3 && k.body.toLowerCase().includes(w)) s += 0.5; });
      return { k, s };
    }).sort((a, b) => b.s - a.s).filter(x => x.s > 0.5);

    let clientNote = '';
    if (client) {
      const bits = [];
      if (/next session|focus/i.test(q)) {
        const lastNote = client.dapNotes[client.dapNotes.length - 1];
        if (client.riskLevel !== 'low') bits.push(`Risk level is ${client.riskLevel} — risk review takes the top of the agenda.`);
        if (lastNote) bits.push(`Last note's plan: ${lastNote.plan.split('. ').slice(-2).join('. ')}`);
        const g = client.goals.find(g => g.status === 'active');
        if (g) bits.push(`Active objective to return to: "${g.text}".`);
      }
      if (/intervention/i.test(q)) {
        const recs = E.recommendInterventions(client).slice(0, 3);
        if (recs.length) bits.push(`Top matched interventions for ${who(client)}: ${recs.map(r => r.iv.name).join('; ')} (see Interventions tab for full rationale).`);
      }
      if (/score|assessment/i.test(q)) {
        const latest = CC.ASSESSMENTS.map(t => { const s = E.latestScore(client, t.key); return s ? `${t.key}: ${s.score} — ${E.interpretScore(t.key, s.score).band.label}` : null; }).filter(Boolean);
        if (latest.length) bits.push(`${who(client)}'s latest scores: ${latest.join('; ')}.`);
      }
      if (bits.length) clientNote = bits.join(' ');
    }
    return { matches: scored.slice(0, 3).map(x => x.k), clientNote };
  };

  /* ============================================================
     NEXT-SESSION FOCUS + CHANGES SINCE LAST SESSION
     ============================================================ */
  E.nextSessionFocus = (client) => {
    const c = client, items = [];
    if (c.riskLevel === 'acute' || c.riskLevel === 'high') {
      items.push(`Re-assess risk first — current level is ${c.riskLevel}. Review the safety plan and means restriction before any other agenda.`);
    } else if (c.riskLevel === 'moderate') {
      items.push('Brief risk check-in (level is moderate) — confirm no escalation since last contact.');
    }
    const srs = E.latestScore(c, 'SRS');
    if (srs && srs.score < 36) items.push(`Alliance check: last SRS was ${srs.score} (<36) — invite open feedback about how sessions are landing.`);
    const lastNote = c.dapNotes[c.dapNotes.length - 1];
    if (lastNote?.inputs?.homework) items.push(`Review the assigned between-session work: ${lastNote.inputs.homework}.`);
    if (lastNote?.inputs?.nextFocus) items.push(`Planned focus from last note: ${lastNote.inputs.nextFocus}.`);
    const goal = (c.goals || []).find(g => g.status === 'active');
    if (goal) items.push(`Advance the active objective: “${goal.text}” (${goal.progress || 0}% progress).`);
    const recentRiskEvents = (c.timeline || []).filter(t => t.type === 'risk').slice(-1);
    if (recentRiskEvents.length && c.riskLevel === 'low') items.push(`Follow up on the recent flagged item: ${recentRiskEvents[0].summary}.`);
    const overdue = CC.ASSESSMENTS.filter(t => ['PHQ-9', 'GAD-7'].includes(t.key)).filter(t => {
      const s = E.latestScore(c, t.key);
      return s && (Date.now() - new Date(s.date).getTime()) > 28 * 86400000;
    });
    if (overdue.length) items.push(`Re-administer ${overdue.map(t => t.key).join(' and ')} — last administration is over 4 weeks old.`);
    if ((c.themes || []).length) items.push(`Bridge session material back to the core themes on file: ${c.themes.slice(0, 3).join(', ')}.`);
    if (!items.length) items.push('Open with the client’s agenda, then return to the treatment plan’s current objective.');
    return items.slice(0, 6);
  };

  E.changesSinceLastSession = (client) => {
    const c = client;
    const lastNote = c.dapNotes[c.dapNotes.length - 1];
    const since = lastNote ? lastNote.ts : (Date.now() - 14 * 86400000);
    return (c.changeLog || []).filter(ch => ch.ts > since).slice(-8).reverse();
  };

  /* ============================================================
     OPTIONAL: Claude API polish (online mode, explicit opt-in)
     Direct browser call to the Anthropic Messages API using the
     clinician's own key. Nothing is sent unless the clinician
     enables online mode AND confirms the per-call warning.
     ============================================================ */
  E.aiAvailable = () => {
    const ai = CC.store.db?.settings?.ai;
    return !!(ai && ai.mode === 'api' && ai.apiKey);
  };

  E.aiPolish = async (task, draftText, contextText) => {
    const ai = CC.store.db.settings.ai;
    const system = [
      'You are a clinical-documentation assistant for a licensed therapist.',
      'Improve the DRAFT below: professional clinical language, concise but comprehensive, behaviorally specific, no over-pathologizing.',
      'Frame inferences as hypotheses ("presentation is consistent with…"). Never state or imply a definitive diagnosis.',
      'Preserve all factual content and any risk-related statements exactly in meaning. Do not invent facts not present in the draft or context.',
      'Return only the revised text, no preamble.',
    ].join(' ');
    const body = {
      model: ai.model || 'claude-opus-4-8',
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: `TASK: ${task}\n\nCONTEXT (clinician-provided):\n${contextText || '(none)'}\n\nDRAFT TO REVISE:\n${draftText}` }],
    };
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ai.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `API error ${res.status}`);
    }
    const msg = await res.json();
    if (msg.stop_reason === 'refusal') throw new Error('The model declined this request (safety refusal). The local draft is unchanged.');
    const text = (msg.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) throw new Error('Empty response from the API. The local draft is unchanged.');
    return text;
  };
})();
