/* ============================================================
   CaseCompass — clinical reference data
   Profile schema, assessment tools, interventions library,
   knowledge base, DAP note styles, and phrase banks used by the
   local drafting engine. All generated text is framed as a draft
   or hypothesis for licensed-clinician review.
   ============================================================ */
'use strict';

const CC = window.CC = window.CC || {};

/* ---------------- constants ---------------- */
CC.MAX_CLIENTS = 50;

CC.RISK_LEVELS = [
  { key: 'low',      label: 'Low',      chip: 'chip-ok',       desc: 'No current SI/HI, stable, protective factors present' },
  { key: 'moderate', label: 'Moderate', chip: 'chip-warn',     desc: 'Passive ideation, elevated stressors, or early recovery — monitor each session' },
  { key: 'high',     label: 'High',     chip: 'chip-serious',  desc: 'Active ideation without intent/plan, recent relapse, or acute instability — safety plan required' },
  { key: 'acute',    label: 'Acute',    chip: 'chip-critical', desc: 'Active ideation with plan/intent or imminent danger — crisis protocol, consider higher level of care' },
];

CC.LEVELS_OF_CARE = [
  'Outpatient (weekly)', 'Outpatient (biweekly)', 'Intensive Outpatient (IOP)',
  'Partial Hospitalization (PHP)', 'Residential', 'Inpatient', 'Sober living + OP', 'Telehealth outpatient', 'Other',
];

CC.ATTACHMENT_STYLES = ['Unknown / assessing', 'Secure (earned or stable)', 'Anxious–preoccupied', 'Avoidant–dismissive', 'Disorganized / fearful-avoidant', 'Mixed presentation'];

CC.MOTIVATION_STAGES = ['Precontemplation', 'Contemplation', 'Preparation', 'Action', 'Maintenance', 'Ambivalent / fluctuating'];

/* ---------------- holistic profile schema (the "client resume") ---------------- */
CC.PROFILE_SCHEMA = [
  { key: 'presenting',   label: 'Presenting problem',           prompt: 'What are they struggling with right now? What brought them here?' },
  { key: 'distress',     label: 'Subjective distress',          prompt: 'How bad does it feel to them — not just how it looks from the outside?' },
  { key: 'symptoms',     label: 'Current symptoms',             prompt: 'Mood, anxiety, trauma symptoms, sleep, appetite, energy, concentration, irritability, dissociation, compulsions, substance use.' },
  { key: 'timeline',     label: 'Timeline',                     prompt: 'When did it start, what made it worse, what made it better, has this happened before?' },
  { key: 'triggers',     label: 'Triggers',                     prompt: 'Situations, people, emotions, memories, or body states that activate them.' },
  { key: 'coreFears',    label: 'Core fears',                   prompt: 'Rejection, abandonment, failure, being controlled, being exposed, being unsafe, being worthless.' },
  { key: 'coreBeliefs',  label: 'Core beliefs',                 prompt: 'What do they believe about themselves, others, and the world?' },
  { key: 'attachment',   label: 'Attachment style',             prompt: 'How do they respond to closeness, distance, conflict, need, dependency, and vulnerability?' },
  { key: 'family',       label: 'Family system',                prompt: 'Roles, rules, emotional climate, parent and sibling dynamics, enmeshment, neglect, criticism, chaos, control, emotional safety.' },
  { key: 'development',  label: 'Developmental history',        prompt: 'Childhood temperament, major losses, bullying, rejection, instability, school experience, emotional support, early shame.' },
  { key: 'trauma',       label: 'Trauma history',               prompt: 'Abuse, neglect, accidents, violence, betrayal, grief, humiliation, medical trauma, immigration stress, chronic invalidation.' },
  { key: 'defenses',     label: 'Defense mechanisms',           prompt: 'Avoidance, intellectualizing, humor, anger, people-pleasing, shutting down, dissociation, control.' },
  { key: 'regulation',   label: 'Emotional regulation style',   prompt: 'Exploding, collapsing, numbing, overthinking, reassurance-seeking, isolating, substances, hyper-independence.' },
  { key: 'relational',   label: 'Relational patterns',          prompt: 'Who they pursue, avoid, tolerate, rescue, resent, depend on, or fear losing.' },
  { key: 'conflict',     label: 'Conflict style',               prompt: 'Fight, flight, freeze, fawn, appease, dominate, withdraw, blame, self-blame, repair, stonewall.' },
  { key: 'shame',        label: 'Shame map',                    prompt: 'What makes them feel defective, exposed, inferior, guilty, or not good enough?' },
  { key: 'values',       label: 'Values and identity',          prompt: 'What matters to them? Who are they trying to be? What gives them pride, meaning, dignity, purpose?' },
  { key: 'strengths',    label: 'Strengths',                    prompt: 'Intelligence, empathy, resilience, insight, humor, discipline, creativity, loyalty, spirituality, courage, survival skills.' },
  { key: 'coping',       label: 'Coping strategies',            prompt: 'Healthy and unhealthy ways they manage pain.' },
  { key: 'substance',    label: 'Substance use',                prompt: 'What they use, why, what emotion it regulates, what it costs them, what they fear without it.' },
  { key: 'riskFactors',  label: 'Risk factors',                 prompt: 'SI, self-harm, violence, impulsivity, psychosis, severe substance use, isolation, hopelessness, access to means.' },
  { key: 'protective',   label: 'Protective factors',           prompt: 'Relationships, responsibilities, beliefs, future goals, pets, children, treatment engagement, coping tools, moral anchors.' },
  { key: 'mentalStatus', label: 'Mental status',                prompt: 'Appearance, behavior, speech, mood, affect, thought process/content, insight, judgment, orientation, memory, attention.' },
  { key: 'cultural',     label: 'Cultural background',          prompt: 'Ethnicity, religion, gender norms, immigration, family expectations, shame/honor, stigma, language, community values.' },
  { key: 'medical',      label: 'Medical & biological factors', prompt: 'Sleep, pain, hormones, medications, neurological issues, chronic illness, diet, exercise, withdrawal.' },
  { key: 'personality',  label: 'Personality structure',        prompt: 'Identity stability, self-esteem, empathy, boundaries, impulse control, emotional range, reality testing.' },
  { key: 'motivation',   label: 'Motivation for change',        prompt: 'Ready, resistant, scared, ambivalent, externally pressured, or genuinely seeking growth.' },
  { key: 'secondaryGains', label: 'Secondary gains',            prompt: 'What does the symptom protect them from? What does staying the same help them avoid?' },
  { key: 'unmetNeeds',   label: 'Unmet needs',                  prompt: 'Safety, love, respect, autonomy, validation, belonging, competence, control, rest, forgiveness, justice.' },
  { key: 'repetition',   label: 'Repetition patterns',          prompt: 'What painful story keeps repeating across relationships, jobs, family, self-image?' },
  { key: 'therapyClues', label: 'Therapeutic relationship clues', prompt: 'How the client relates to you may mirror how they relate to others: guarded, pleasing, testing, dependent, avoidant, suspicious, idealizing, dismissive, fearful.' },
];

/* ---------------- assessment tools ---------------- */
CC.ASSESSMENTS = [
  {
    key: 'PHQ-9', name: 'PHQ-9 — Depression', max: 27, cadence: 'Every 2–4 weeks',
    bands: [
      { min: 0, max: 4, label: 'Minimal', sev: 0 }, { min: 5, max: 9, label: 'Mild', sev: 1 },
      { min: 10, max: 14, label: 'Moderate', sev: 2 }, { min: 15, max: 19, label: 'Moderately severe', sev: 3 },
      { min: 20, max: 27, label: 'Severe', sev: 4 },
    ],
    note: 'Item 9 screens passive SI — any positive response warrants direct risk assessment (e.g., C-SSRS) the same day. A drop of ≥5 points is a reliable change; <10 for 2 administrations suggests response.',
  },
  {
    key: 'GAD-7', name: 'GAD-7 — Anxiety', max: 21, cadence: 'Every 2–4 weeks',
    bands: [
      { min: 0, max: 4, label: 'Minimal', sev: 0 }, { min: 5, max: 9, label: 'Mild', sev: 1 },
      { min: 10, max: 14, label: 'Moderate', sev: 2 }, { min: 15, max: 21, label: 'Severe', sev: 4 },
    ],
    note: '≥10 is the common clinical cutoff. Also screens reasonably for panic, social anxiety, and PTSD-adjacent arousal — follow up with disorder-specific measures when elevated.',
  },
  {
    key: 'PCL-5', name: 'PCL-5 — PTSD symptoms', max: 80, cadence: 'Every 4 weeks',
    bands: [
      { min: 0, max: 30, label: 'Below provisional cutoff', sev: 0 },
      { min: 31, max: 49, label: 'Probable PTSD range', sev: 3 },
      { min: 50, max: 80, label: 'High severity', sev: 4 },
    ],
    note: 'Cutoff 31–33 suggests probable PTSD (confirm with clinical interview / CAPS-5). A 10–20 point drop indicates clinically meaningful change; ≥5 is reliable change. Review cluster scores (B intrusions, C avoidance, D cognition/mood, E arousal), not just the total.',
  },
  {
    key: 'AUDIT', name: 'AUDIT — Alcohol use', max: 40, cadence: 'Intake + quarterly',
    bands: [
      { min: 0, max: 7, label: 'Low risk', sev: 0 }, { min: 8, max: 14, label: 'Hazardous', sev: 2 },
      { min: 15, max: 19, label: 'Harmful', sev: 3 }, { min: 20, max: 40, label: 'Possible dependence', sev: 4 },
    ],
    note: '≥8 warrants brief intervention; ≥20 warrants diagnostic evaluation for alcohol use disorder and consideration of medically supervised withdrawal.',
  },
  {
    key: 'DAST-10', name: 'DAST-10 — Drug use', max: 10, cadence: 'Intake + quarterly',
    bands: [
      { min: 0, max: 0, label: 'No problems reported', sev: 0 }, { min: 1, max: 2, label: 'Low level', sev: 1 },
      { min: 3, max: 5, label: 'Moderate', sev: 2 }, { min: 6, max: 8, label: 'Substantial', sev: 3 },
      { min: 9, max: 10, label: 'Severe', sev: 4 },
    ],
    note: '≥3 suggests intensive assessment. Pair with stage-of-change evaluation — the score says severity, not readiness.',
  },
  {
    key: 'BAM-R', name: 'BAM-R — Brief Addiction Monitor', max: 51, cadence: 'Monthly in SUD care',
    bands: [
      { min: 0, max: 17, label: 'Lower risk profile', sev: 1 }, { min: 18, max: 34, label: 'Mixed profile', sev: 2 },
      { min: 35, max: 51, label: 'Higher risk profile', sev: 3 },
    ],
    note: 'Interpret by subscale, not total: Use (recent consumption), Risk factors (craving, exposure, mood), and Protective factors (support, structure, self-efficacy). Rising risk + falling protective = tighten relapse-prevention plan.',
  },
  {
    key: 'C-SSRS', name: 'C-SSRS — Columbia Suicide Severity', max: 5, cadence: 'Any SI signal; per protocol',
    bands: [
      { min: 0, max: 0, label: 'No ideation reported', sev: 0 },
      { min: 1, max: 2, label: 'Passive / active nonspecific ideation', sev: 2 },
      { min: 3, max: 3, label: 'Ideation + method (no plan/intent)', sev: 3 },
      { min: 4, max: 5, label: 'Ideation with intent ± plan', sev: 4 },
    ],
    note: 'Enter the highest ideation level (0–5). Levels 4–5 (intent, plan) indicate high acute risk: same-day safety planning, means restriction, and consideration of a higher level of care. Any recent behavior (attempt, preparatory acts) elevates risk regardless of ideation score.',
  },
  {
    key: 'ACE', name: 'ACE — Adverse Childhood Experiences', max: 10, cadence: 'Intake (once)',
    bands: [
      { min: 0, max: 0, label: 'None reported', sev: 0 }, { min: 1, max: 3, label: 'Present', sev: 1 },
      { min: 4, max: 10, label: 'High (dose-response range)', sev: 3 },
    ],
    note: '≥4 is associated with substantially elevated risk for depression, SUD, and health problems. Use as context for a trauma-informed formulation — it is a history measure, not a symptom measure.',
  },
  {
    key: 'ORS', name: 'ORS — Outcome Rating Scale', max: 40, cadence: 'Every session',
    bands: [
      { min: 0, max: 24, label: 'Clinical range', sev: 2 }, { min: 25, max: 40, label: 'Non-clinical range', sev: 0 },
    ],
    note: 'Cutoff 25; reliable change is 5 points. A flat or falling trajectory after 3–4 sessions is a signal to discuss the alliance and approach directly.',
  },
  {
    key: 'SRS', name: 'SRS — Session Rating Scale (alliance)', max: 40, cadence: 'Every session',
    bands: [
      { min: 0, max: 35, label: 'Discuss alliance', sev: 2 }, { min: 36, max: 40, label: 'Strong alliance', sev: 0 },
    ],
    note: '<36 means something in the alliance deserves open discussion — clients who mark low and are invited to talk about it often become the strongest alliances.',
  },
];

/* ---------------- DAP note styles ---------------- */
CC.DAP_STYLES = [
  { key: 'standard',      label: 'Standard',                 hint: 'Balanced, professional outpatient documentation.' },
  { key: 'brief',         label: 'Brief',                    hint: 'Tight, 3–5 sentences per section.' },
  { key: 'detailed',      label: 'Highly detailed',          hint: 'Expanded clinical observation and reasoning.' },
  { key: 'insurance',     label: 'Insurance-friendly',       hint: 'Medical necessity, goals, measurable progress, CPT-ready language.' },
  { key: 'residential',   label: 'Residential treatment',    hint: 'Milieu participation, structure, staff coordination.' },
  { key: 'sud',           label: 'Substance-use treatment',  hint: 'Cravings, triggers, relapse prevention, recovery supports.' },
  { key: 'trauma',        label: 'Trauma-informed',          hint: 'Stabilization, window of tolerance, grounding, titration.' },
  { key: 'psychodynamic', label: 'Psychodynamic',            hint: 'Process, transference themes, defenses, relational patterns.' },
  { key: 'cbtdbt',        label: 'CBT/DBT',                  hint: 'Skills taught and practiced, cognitions, behavior chains, homework.' },
];

/* ---------------- risk keyword scanner ---------------- */
CC.RISK_PATTERNS = [
  { re: /\b(suicid\w*|\bSI\b|kill (?:him|her|them)?self|end (?:my|his|her|their) life|not want(?:ing)? to (?:live|be here)|better off dead|no reason to live)\b/i, flag: 'Suicidal ideation language detected', kind: 'si' },
  { re: /\b(self[- ]harm|cutting|burn(?:ing)? (?:him|her|them)?self|\bNSSI\b)\b/i, flag: 'Self-harm language detected', kind: 'nssi' },
  { re: /\b(homicid\w*|\bHI\b|hurt (?:someone|him|her|them)\b|kill (?:someone|him|her|them))\b/i, flag: 'Harm-to-others language detected', kind: 'hi' },
  { re: /\b(relapse[sd]?|used again|drank again|slipped|picked up|overdose|\bOD\b)\b/i, flag: 'Relapse / use event language detected', kind: 'sud' },
  { re: /\b(abus\w+ (?:a |the )?(?:child|minor|kid)|child abuse|elder abuse|neglect(?:ing)? (?:a |the )?(?:child|elder))\b/i, flag: 'Possible mandated-reporting content detected', kind: 'report' },
  { re: /\b(hopeless\w*|worthless\w*|burden to everyone|no way out)\b/i, flag: 'Hopelessness language detected', kind: 'hopeless' },
  { re: /\b(domestic violence|\bDV\b|partner hit|being hit|afraid of (?:him|her|them) at home|unsafe at home)\b/i, flag: 'Possible interpersonal-violence exposure', kind: 'ipv' },
];

CC.RISK_REMINDERS = {
  si: 'Complete/refresh a structured risk assessment (e.g., C-SSRS), review means restriction, and update the safety plan. Document risk level, rationale, and disposition.',
  nssi: 'Assess function, frequency, medical severity, and urges; distinguish NSSI from suicidal intent; update coping/safety plan.',
  hi: 'Assess intent, plan, target, and access to means. Review duty-to-warn/protect obligations in your jurisdiction (e.g., Tarasoff-type duties) and consult/document.',
  sud: 'Assess use event non-judgmentally (what, when, how much, triggers), re-evaluate relapse-prevention plan and level of care; consider toxicology/medical needs.',
  report: 'Possible mandated-reporting content. Review your jurisdiction’s reporting requirements and timelines, consult supervisor/legal as needed, and document actions taken.',
  hopeless: 'Hopelessness is a strong SI risk marker — probe directly for ideation, reasons for living, and protective factors.',
  ipv: 'Screen for current safety, lethality indicators (strangulation, weapons, escalation), and safe-contact planning. Provide DV resources; document carefully with client safety in mind.',
};

/* ---------------- interventions library ---------------- */
/* tags: dx (depression, anxiety, ptsd, sud, personality), attach (anxious, avoidant, disorganized, secure),
   stage (pre, contemplation, action...), needs (stabilization, shame, regulation, relational, meaning, grief) */
CC.INTERVENTIONS = [
  {
    key: 'mi', name: 'Motivational Interviewing (MI)',
    tags: { dx: ['sud'], stage: ['Precontemplation', 'Contemplation', 'Ambivalent / fluctuating'], needs: ['engagement'] },
    fits: 'Ambivalence about change — especially substance use, treatment engagement, or externally pressured clients. Meets the client where they are instead of pushing.',
    how: 'OARS (open questions, affirmations, reflections, summaries); elicit change talk and roll with resistance; develop discrepancy between values and behavior; scale readiness/confidence (0–10) and ask "why not lower?"',
    avoid: 'The righting reflex — arguing for change, premature action planning, confrontation, or labeling. These reliably produce sustain talk.',
    working: 'Client voices their own reasons for change (change talk increases), defensiveness drops, small self-initiated experiments appear between sessions.',
    notReady: 'Rarely "not ready" — MI is the readiness intervention. If a client is in acute crisis or intoxicated in session, stabilize first.',
  },
  {
    key: 'cbt', name: 'Cognitive Behavioral Therapy (CBT)',
    tags: { dx: ['depression', 'anxiety'], needs: ['regulation', 'skills'] },
    fits: 'Depression and anxiety with identifiable negative automatic thoughts, avoidance, or unhelpful behavioral loops; clients who like structure and homework.',
    how: 'Socialize to the model (thoughts–feelings–behavior); thought records; behavioral experiments to test predictions; graded exposure for avoidance; relapse-prevention blueprint at the end.',
    avoid: 'Challenging trauma-driven beliefs as mere "distortions," or turning sessions into debate. Cognition work before stabilization in acute PTSD can backfire.',
    working: 'Client spontaneously catches and reframes thoughts, completes between-session experiments, avoidance shrinks, scores (PHQ-9/GAD-7) trend down.',
    notReady: 'Active crisis, unmanaged psychosis or intoxication, or when the client experiences worksheets as invalidation — build alliance and stabilization first.',
  },
  {
    key: 'dbt', name: 'DBT skills (distress tolerance, emotion regulation)',
    tags: { dx: ['personality', 'sud'], attach: ['disorganized'], needs: ['stabilization', 'regulation'] },
    fits: 'Emotion dysregulation, self-harm urges, impulsivity, crisis-prone presentations, and intense/unstable relationships.',
    how: 'Teach and rehearse concrete skills: TIPP and paced breathing for acute arousal; STOP for impulses; opposite action; PLEASE for vulnerability factors; chain analysis after target behaviors; diary cards for tracking.',
    avoid: 'Teaching skills only in the abstract (rehearse in session), or using "skills" language to dismiss real environmental problems. Don’t chain-analyze while the client is still at peak arousal.',
    working: 'Time-to-recovery after emotional spikes shortens; client reports using a skill in the wild; self-harm/urge frequency drops on tracking.',
    notReady: 'If the client can’t yet tolerate structure, start with 1–2 grounding skills and validation-heavy sessions rather than a full curriculum.',
  },
  {
    key: 'act', name: 'Acceptance & Commitment Therapy (ACT)',
    tags: { dx: ['anxiety', 'depression'], needs: ['meaning', 'values'] },
    fits: 'Experiential avoidance, fusion with self-critical stories, chronic conditions, and clients stuck in control agendas ("I must not feel this").',
    how: 'Creative hopelessness (what has controlling the feeling cost?); defusion exercises (naming the story, thanking the mind); values clarification card sorts; committed-action steps sized to willingness.',
    avoid: 'Using acceptance language to bypass legitimate problem-solving or safety needs; metaphors that feel dismissive to concrete thinkers.',
    working: 'Client acts on values despite discomfort, describes thoughts as thoughts ("I’m having the thought that…"), willingness scores rise.',
    notReady: 'Acute crisis and untreated severe depression with psychomotor impairment — stabilize and behaviorally activate first.',
  },
  {
    key: 'psychodynamic', name: 'Psychodynamic / insight-oriented work',
    tags: { attach: ['avoidant', 'anxious', 'disorganized'], needs: ['relational', 'insight'] },
    fits: 'Repeating relational patterns the client can’t explain, chronic self-defeat, rich inner life, curiosity about "why am I like this."',
    how: 'Track transference and countertransference; link current patterns to developmental origins gently and tentatively; work with defenses by naming their protective function first; use the therapy relationship as live data.',
    avoid: 'Deep interpretation before safety is established, interpreting defenses as pathology, or racing to childhood material with a destabilized client.',
    working: 'Client makes their own links between past and present, tolerates ambivalence, brings dreams/relational episodes as material, ruptures become repairable.',
    notReady: 'Clients in acute crisis, early recovery needing concrete structure, or those who experience open-ended exploration as unsafe — titrate insight work.',
  },
  {
    key: 'attachment', name: 'Attachment-based therapy',
    tags: { attach: ['anxious', 'avoidant', 'disorganized'], needs: ['relational'] },
    fits: 'When the presenting problem is fundamentally about closeness — abandonment fear, intimacy avoidance, protest behaviors, or caregiving collapse.',
    how: 'Map the client’s attachment strategy without judgment; provide a reliable, boundaried secure-base experience; process ruptures explicitly; practice naming needs directly instead of protest/withdrawal.',
    avoid: 'Recreating the wound: inconsistency, surprise cancellations without repair, or interpreting protest behavior as manipulation.',
    working: 'Client begins asking for what they need directly, tolerates therapist fallibility, generalizes secure behaviors to outside relationships.',
    notReady: 'Attachment work is slow-release medicine — it is almost always "ready," but expect testing behavior early and pace disclosure demands accordingly.',
  },
  {
    key: 'tf-stabilization', name: 'Trauma-informed stabilization (Phase 1)',
    tags: { dx: ['ptsd'], needs: ['stabilization'] },
    fits: 'PTSD/complex trauma presentations before any processing work: flashbacks, dissociation, nightmares, hyperarousal, or a chaotic current life.',
    how: 'Psychoeducation (window of tolerance, trauma responses as adaptations); grounding menu (5-4-3-2-1, orienting, temperature, movement); sleep and routine scaffolding; resource-building (safe/calm place, container); track dissociation in session and titrate.',
    avoid: 'Detailed trauma narrative elicitation before stabilization; exposure by accident (letting sessions become uncontained retellings); assuming calm = regulated (freeze can look calm).',
    working: 'Client can down-shift arousal in session with prompts, dissociation episodes shorten, sleep/routine stabilizes, they report using grounding between sessions.',
    notReady: 'This IS the readiness work. If even psychoeducation activates, slow further: shorter sessions, more titration, strengthen external stability first.',
  },
  {
    key: 'emdr-prep', name: 'EMDR preparation / resourcing',
    tags: { dx: ['ptsd'], needs: ['stabilization'] },
    fits: 'Clients heading toward EMDR reprocessing who need affect-tolerance scaffolding, or as a standalone resourcing approach.',
    how: 'Explain AIP model; build and install resources (safe/calm place, container, protective figures) with slow short BLS sets; teach self-soothing; establish stop signal and dual awareness; assess dissociation (e.g., DES-II) before processing.',
    avoid: 'Starting reprocessing without stop signal/dual awareness, or with unmanaged dissociation, active suicidality, or no stability between sessions.',
    working: 'Client can evoke resources on cue and return to window of tolerance within minutes; SUDs on small disturbances drop with resourcing alone.',
    notReady: 'High dissociation, active SI, or current ongoing danger (e.g., living with abuser) — stabilization and safety come first.',
  },
  {
    key: 'relapse-prevention', name: 'Relapse prevention (RP)',
    tags: { dx: ['sud'], stage: ['Action', 'Maintenance'], needs: ['skills'] },
    fits: 'Clients in action/maintenance for substance use — building a concrete map of triggers, warning signs, and responses.',
    how: 'Trigger mapping (people/places/emotions/body states); seemingly irrelevant decisions; craving surfing and urge-delay; abstinence-violation-effect psychoeducation (a slip is data, not proof of failure); written RP plan with supports and emergency steps.',
    avoid: 'Shame-based framing of slips; RP worksheets as a substitute for addressing the emotion the substance regulates.',
    working: 'Client predicts their own high-risk situations in advance, uses the plan during at least one real craving, lapses (if any) are shorter and disclosed sooner.',
    notReady: 'Precontemplation/contemplation — do MI first; an RP plan the client doesn’t want is paperwork.',
  },
  {
    key: 'psychoeducation', name: 'Psychoeducation',
    tags: { needs: ['engagement', 'stabilization'] },
    fits: 'Nearly universal early intervention: normalizes symptoms, reduces shame, builds shared language and treatment rationale.',
    how: 'Short, concrete, collaborative teaching tied to the client’s own examples: trauma responses, anxiety loops, depression’s behavior spiral, tolerance/withdrawal, attachment styles. Check understanding by asking them to explain it back for their own life.',
    avoid: 'Lecturing, jargon, or information as a substitute for feeling heard. Time it after validation, not instead of it.',
    working: 'Client uses the shared language spontaneously ("that was my alarm system, not danger"), shame statements decrease.',
    notReady: 'Almost never contraindicated; shorten it when arousal is high.',
  },
  {
    key: 'somatic', name: 'Somatic grounding & body-based regulation',
    tags: { dx: ['ptsd', 'anxiety'], needs: ['stabilization', 'regulation'] },
    fits: 'Clients who live "from the neck up," dissociate, panic somatically, or can’t access feelings verbally.',
    how: 'Orienting to the room; feet/chair contact; paced and physiological-sigh breathing; progressive muscle release; titrated interoception ("notice the 10% of your body that feels most neutral"); movement to complete stress responses.',
    avoid: 'Prolonged eyes-closed interoception with dissociative clients; touch without explicit protocol and consent; pushing body focus when it spikes panic.',
    working: 'Visible down-shift in session (breath, posture, voice), client self-initiates grounding, panic peaks shorter.',
    notReady: 'If any body focus triggers flooding, start external (orienting to the room, objects, sounds) before internal sensation work.',
  },
  {
    key: 'parts', name: 'Parts work (IFS-informed)',
    tags: { dx: ['ptsd'], attach: ['disorganized'], needs: ['shame', 'insight'] },
    fits: 'Internal conflict ("part of me wants to heal, part of me wants to burn it down"), harsh inner critics, protective numbing, self-sabotage.',
    how: 'Language shift ("a part of you…"); map protectors and what they protect; ask protectors’ permission before approaching pain; cultivate curious, compassionate Self-energy toward each part; unblend when a part takes over.',
    avoid: 'Bypassing protectors to reach exiled pain; treating destructive parts as enemies to eliminate; parts language with clients experiencing psychosis (can blur reality boundaries).',
    working: 'Client speaks *for* parts instead of *from* them, inner-critic tone softens, self-compassion becomes accessible.',
    notReady: 'Poor reality testing, or when the client experiences parts framing as "you’re saying I’m crazy" — use plain-language versions ("the protective side of you").',
  },
  {
    key: 'family-systems', name: 'Family systems work',
    tags: { needs: ['relational'] },
    fits: 'When symptoms are maintained by the system: enmeshment, rigid roles (hero, scapegoat, lost child), triangulation, or when family is the main trigger and resource at once.',
    how: 'Genogram; identify roles and rules ("don’t talk, don’t trust, don’t feel"); differentiate self from role; coach boundary experiments; family sessions with clear structure when appropriate.',
    avoid: 'Taking sides, letting family sessions become prosecution, or pushing confrontation the client hasn’t chosen.',
    working: 'Client responds differently to the same family provocation, guilt after boundary-setting shrinks faster, role language ("I’m the fixer") becomes conscious.',
    notReady: 'Ongoing violence or when contact itself is unsafe — safety and individual work first.',
  },
  {
    key: 'boundaries', name: 'Boundary work',
    tags: { attach: ['anxious'], needs: ['relational', 'skills'] },
    fits: 'People-pleasing, fawning, resentment cycles, caretaker collapse, and post-SUD relationship rebuilding.',
    how: 'Distinguish walls vs boundaries; scripts and rehearsal ("I can’t take that on this week"); predict and normalize the guilt wave; graded practice from low-stakes to high-stakes relationships; connect boundaries to values, not punishment.',
    avoid: 'Framing boundaries as ultimatums; pushing high-stakes confrontation first; ignoring realistic retaliation risks (DV contexts).',
    working: 'Client sets one small boundary and survives the guilt; resentment language decreases; they stop over-explaining.',
    notReady: 'In active DV, boundary assertion can escalate danger — safety planning first, with DV-informed consultation.',
  },
  {
    key: 'shame-resilience', name: 'Shame resilience work',
    tags: { needs: ['shame'] },
    fits: 'Clients whose core wound is defectiveness: perfectionism, hiding, rage-at-self, addiction as shame anesthesia.',
    how: 'Name shame vs guilt (I am bad vs I did bad); map shame triggers and armor (perfectionism, numbing, lashing out); titrated disclosure met with attunement; self-compassion practices; "speak to yourself as you would to them" experiments.',
    avoid: 'Reassurance-bombing (it slides off), premature positive affirmations, or exposing shame material faster than the alliance can hold.',
    working: 'Client tells you the embarrassing version of the story, tolerates being seen without deflecting, self-talk softens.',
    notReady: 'Very early alliance — shame work rides on safety. Earn disclosure with consistent non-judgment first.',
  },
  {
    key: 'behavioral-activation', name: 'Behavioral activation (BA)',
    tags: { dx: ['depression'], needs: ['skills'] },
    fits: 'Depression with withdrawal, inactivity, and anhedonia — especially when cognitive work feels impossible ("I can’t think my way out").',
    how: 'Activity and mood monitoring; values-linked activity menu; schedule smallest-viable actions (outside-in: action before motivation); anticipate avoidance with if-then plans; review mastery/pleasure ratings.',
    avoid: 'Overloading the schedule (guarantees failure evidence), moralizing missed activities, ignoring real barriers (pain, poverty, caregiving).',
    working: 'Any completed scheduled activity + honest review; mood ratings begin to track activity; client initiates their own additions.',
    notReady: 'Severe psychomotor retardation may need psychiatric consult alongside; start with micro-actions (sit up, open blinds).',
  },
  {
    key: 'safety-planning', name: 'Safety planning (Stanley–Brown style)',
    tags: { needs: ['stabilization', 'risk'] },
    fits: 'Any SI history, NSSI, post-crisis stabilization, or high-risk transitions (discharge, anniversary dates, relapse).',
    how: 'Collaboratively build: warning signs → internal coping → social distraction → people to ask for help → professionals/crisis lines (e.g., 988 in the US) → means restriction. Make it specific, written, and rehearsed; put it where they’ll find it.',
    avoid: 'No-suicide "contracts" (no evidence, harms honesty); building the plan *at* the client instead of with them; skipping means restriction because it’s awkward.',
    working: 'Client can recite first two steps from memory, reports actually using a step, updates it voluntarily after changes.',
    notReady: 'Never "not ready" when risk is present — but if the client won’t engage, that itself is high-signal risk data requiring consultation/disposition planning.',
  },
  {
    key: 'crisis-stabilization', name: 'Crisis stabilization',
    tags: { needs: ['stabilization', 'risk'] },
    fits: 'Acute destabilization: panic spirals, post-loss shock, acute SI, relapse crisis, dissociative episodes in session.',
    how: 'Lower demands; slow your own voice and pace; grounding and orientation; concrete next-72-hours plan (sleep, food, contact, removal of means); increase contact frequency temporarily; involve supports with consent; document disposition rationale.',
    avoid: 'Insight work, confrontation, or long silences during acute crisis; ending sessions without a concrete plan.',
    working: 'Arousal visibly reduces in session; client leaves with a written micro-plan and follows any part of it.',
    notReady: 'N/A — this is the floor intervention. If it isn’t enough, that’s a level-of-care decision.',
  },
  {
    key: 'coping-skills', name: 'Coping skills training',
    tags: { needs: ['skills', 'regulation'] },
    fits: 'Early treatment across presentations — a shared toolkit before deeper work.',
    how: 'Build a personalized menu (breathing, grounding, movement, cold water, music, calling X); rehearse in session at low arousal; match skill to state (high arousal = body-first, low mood = activation-first); track what actually worked.',
    avoid: 'Generic handouts without rehearsal; implying skills should erase feelings; skill-stacking as avoidance of underlying issues forever.',
    working: 'Client reports trying at least one skill in a real moment — even imperfectly. Refine from there.',
    notReady: 'Rarely — but sequence after validation, or it lands as "stop feeling and do a worksheet."',
  },
  {
    key: 'values-work', name: 'Values & meaning work',
    tags: { needs: ['meaning'], stage: ['Action', 'Maintenance'] },
    fits: 'Post-stabilization drift ("I’m sober/less depressed… now what?"), identity rebuilding, chronic emptiness, life-transition work.',
    how: 'Values card sorts; "80th birthday speech" and eulogy exercises; values vs goals distinction; audit weekly time against stated values; build one committed action per domain.',
    avoid: 'Prescribing values; moralizing; meaning-talk while the house is on fire (crisis, acute withdrawal).',
    working: 'Client makes an unprompted choice referencing values ("I went because family matters to me"), emptiness language decreases.',
    notReady: 'Acute crisis or early withdrawal — revisit once stabilized.',
  },
  {
    key: 'grief', name: 'Grief work',
    tags: { needs: ['grief'] },
    fits: 'Death loss, but also non-death losses: divorce, estrangement, health, the childhood they never had, identities lost to addiction.',
    how: 'Normalize oscillation (loss orientation ↔ restoration orientation); continuing-bonds practices (letters, rituals); name disenfranchised grief explicitly; distinguish grief from depression; pace exposure to reminders.',
    avoid: 'Stage-model policing ("you should be at acceptance"), pushing "moving on," pathologizing culturally normal mourning.',
    working: 'Client can approach reminders with sadness rather than avoidance or collapse; tells fuller stories of the lost person/life.',
    notReady: 'If grief material triggers acute SI, pair tightly with safety planning and slow the exposure gradient.',
  },
  {
    key: 'emotion-regulation', name: 'Emotion regulation training',
    tags: { needs: ['regulation'], dx: ['personality', 'anxiety'] },
    fits: 'Clients who identify feelings late (already at 9/10), alexithymia, mood-driven decisions.',
    how: 'Feelings vocabulary building; body-cue mapping (where does anger start?); 0–10 intensity scaling with checkpoints; "name it to tame it" practice; ABC PLEASE vulnerability reduction; opposite action for justified-but-unhelpful urges.',
    avoid: 'Implying feelings are the enemy; skipping validation of why big feelings made sense historically.',
    working: 'Client catches an emotion at 5/10 instead of 9/10 and chooses a response; emotion words diversify beyond "fine/angry."',
    notReady: 'During flooding, regulate first (co-regulation, grounding); teach when inside the window of tolerance.',
  },
  {
    key: 'interpersonal-effectiveness', name: 'Interpersonal effectiveness (DEAR MAN family)',
    tags: { needs: ['relational', 'skills'] },
    fits: 'Clients who explode, fold, or avoid in interpersonal asks — complementary to boundary work.',
    how: 'Teach DEAR MAN (ask skill), GIVE (relationship skill), FAST (self-respect skill); write and rehearse actual upcoming conversations; debrief real attempts with chain analysis.',
    avoid: 'Scripting the client into a personality that isn’t theirs; ignoring power/safety realities of their relationships.',
    working: 'One real-world structured ask attempted; client differentiates goals (objective vs relationship vs self-respect).',
    notReady: 'Mid-crisis or when the counterpart is dangerous — safety assessment first.',
  },
];

/* ---------------- safety & rapport playbooks by attachment ---------------- */
CC.RAPPORT_BY_ATTACHMENT = {
  'Anxious–preoccupied': {
    speak: 'Warm, consistent, and explicit. Say out loud what a secure therapist means implicitly: "I’m not going anywhere; we’ll figure this out together." Summarize often so they feel tracked.',
    unsafe: 'Ambiguity, lateness or schedule changes without acknowledgment, neutral affect they can read as rejection, ending sessions abruptly at high activation.',
    validation: 'Validation of the *need* underneath protest behaviors: "Of course you checked their phone — the fear of losing people runs deep. Let’s care for that fear differently."',
    confrontation: 'Tolerates gentle challenge if the relationship is affirmed first ("I’m with you, and I want to push on something…"). Raw confrontation reads as abandonment-in-progress.',
    pace: 'Engages fast; the risk is depth without containment. Structure endings carefully; leave 10 minutes for down-regulation.',
    repair: 'Name ruptures immediately and non-defensively; anxious clients often won’t raise them, they’ll just escalate or appease. "Last week felt off when I cut you short — can we talk about it?"',
    avoidSaying: '"You’re overreacting", "just give them space", or anything implying their need itself is the problem.',
  },
  'Avoidant–dismissive': {
    speak: 'Low-pressure, competence-respecting, and concrete. Lead with usefulness (skills, information, problem-solving) and let intimacy grow as a side effect.',
    unsafe: 'Emotional demands early ("how does that make you FEEL?"), sustained eye contact + silence, effusive warmth, being treated as fragile.',
    validation: 'Validate self-reliance as an achievement that had a cost: "Handling everything alone kept you safe. It also left you carrying all of it."',
    confrontation: 'Tolerates direct, logical challenge better than emotional appeal — but never in a way that exposes them as needy. Frame growth as competence expansion.',
    pace: 'Slow burn. Expect months of "fine, busy week" before real material. Don’t chase; be reliably there when the door cracks open.',
    repair: 'They will vanish rather than fight. Normalize ambivalence about therapy itself early ("part of you may want to cancel some weeks — that’s the pattern doing its job") so no-shows become discussable.',
    avoidSaying: '"You need to open up", "you’re avoiding", or pathologizing their independence.',
  },
  'Disorganized / fearful-avoidant': {
    speak: 'Predictable above all. Same room, same structure, telegraph transitions ("in about 10 minutes we’ll start wrapping up"). Ask permission before shifting to hard topics.',
    unsafe: 'Surprises of any kind, intense warmth AND intense neutrality (both mimic the wound), sudden topic shifts to trauma, feeling trapped (blocked door, no clear exit norms).',
    validation: 'Validate the double bind: "You want closeness and it also reads as danger — both of those learned responses make sense given what closeness used to cost."',
    confrontation: 'Minimal and heavily scaffolded. Their system reads challenge as threat; use collaborative wondering ("I notice… what do you make of it?").',
    pace: 'Slowest gradient. Approach–retreat cycles are the work, not resistance. Expect testing (missed sessions, provocations) — pass the tests calmly.',
    repair: 'Repair is the treatment. Every rupture survived without retaliation or abandonment rewrites the model. Be boringly consistent in the repair ritual.',
    avoidSaying: '"Trust me", demands for commitment to therapy, or interpreting testing behavior as manipulation.',
  },
  'Secure (earned or stable)': {
    speak: 'Straightforward and collaborative; they can use the full range of the relationship. Don’t under-serve them by coasting.',
    unsafe: 'Little — but they still deserve pacing around trauma material.',
    validation: 'Normal attunement; they will tell you when you miss.',
    confrontation: 'Tolerates direct feedback well; often appreciates it.',
    pace: 'Standard; follow the material.',
    repair: 'Straightforward acknowledgment works.',
    avoidSaying: 'Nothing specific — avoid complacency.',
  },
  'Mixed presentation': {
    speak: 'Track which strategy is active in the room and match it: anxious-day = containment + warmth; avoidant-day = space + usefulness.',
    unsafe: 'Treating them as one fixed style; being thrown by the switch.',
    validation: 'Validate the switching itself: "Different relationships taught you different survival moves."',
    confrontation: 'Calibrate per-session to the active strategy.',
    pace: 'Flexible, with explicit meta-conversations about what they need today.',
    repair: 'Ask which flavor of repair lands: reassurance or space.',
    avoidSaying: 'Consistency-shaming ("last week you wanted the opposite").',
  },
  'Unknown / assessing': {
    speak: 'Default to trauma-informed universals: predictability, transparency, choice, collaboration.',
    unsafe: 'Assumptions. Watch how they handle closeness, silence, and your mistakes — that’s the assessment.',
    validation: 'Broad validation of the difficulty of starting therapy at all.',
    confrontation: 'Defer until you know the system you’re challenging.',
    pace: 'Moderate; let early sessions be diagnostic of relational style.',
    repair: 'Model it early with small things ("I mispronounced that — thank you for correcting me").',
    avoidSaying: 'Premature depth-interpretations.',
  },
};

/* ---------------- knowledge base ---------------- */
CC.KNOWLEDGE = [
  {
    id: 'kb-formulation-5p', title: 'How do I build a case formulation? (The 5 Ps)', tags: ['formulation', 'how to', 'blind spots'],
    body: `A workable formulation answers: **what happened to this person, how did they adapt to survive it, and what does that adaptation now cost them?** The 5-P scaffold keeps it organized:
• **Presenting** — what's happening now, in behavioral and experiential terms.
• **Predisposing** — temperament, developmental history, trauma, attachment learning, family system, genetics.
• **Precipitating** — why now? The trigger or accumulation that broke the previous equilibrium.
• **Perpetuating** — the loops keeping it going: avoidance, substance use, relational patterns, secondary gains, environment.
• **Protective** — strengths, supports, values, and capacities the plan should be built on, not bolted onto.
Write it as a testable hypothesis, revisit it every few sessions, and version it — the changes in your formulation over time are clinical data themselves.`,
  },
  {
    id: 'kb-blind-spots', title: 'What are possible blind spots in my formulation?', tags: ['formulation', 'blind spots', 'bias'],
    body: `Common formulation blind spots worth auditing:
• **Single-model capture** — everything looks like trauma (or cognition, or attachment) because that's your favorite lens. Try re-writing the formulation in a second model and see what changes.
• **Under-weighted context** — poverty, racism, immigration stress, chronic pain, and caregiving load masquerading as "symptoms."
• **Missing medical differentials** — thyroid, anemia, sleep apnea, medication side effects, withdrawal, TBI.
• **Substance-use minimization** — normalized use the client under-reports and you under-ask about.
• **Secondary gain discomfort** — avoiding the question of what the symptom protects or provides.
• **Countertransference-shaped data** — clients you like get "resilient"; clients who frustrate you get "resistant."
• **Positive-data neglect** — formulations built only from pathology predict poorly. What's going *right*, and why?
Treat every formulation as a hypothesis with a review date, not a verdict.`,
  },
  {
    id: 'kb-next-session', title: 'What should I focus on next session?', tags: ['planning', 'next session'],
    body: `A quick triage hierarchy for choosing next-session focus:
1. **Safety first** — any new risk signal (SI, relapse, DV) takes the agenda.
2. **Alliance second** — a rupture, missed session, or falling SRS score outranks content. Without alliance nothing else transfers.
3. **The plan's active objective** — return to the treatment plan's current measurable objective; review homework/experiments before assigning more.
4. **The live material** — what the client brings, connected explicitly back to formulation themes ("this sounds like the pattern we mapped…").
5. **Loose threads** — anything you flagged in the last note's Plan section.
If a client-selected topic and the plan conflict, do both: honor the material, then bridge it to the objective — that bridge is the therapy.`,
  },
  {
    id: 'kb-scores', title: 'What does this assessment score mean?', tags: ['assessment', 'scores', 'phq-9', 'gad-7', 'pcl-5', 'audit', 'c-ssrs'],
    body: `Enter scores in the Assessments tab for automatic interpretation against standard bands. Quick reference:
• **PHQ-9** (0–27): 5/10/15/20 = mild/moderate/mod-severe/severe. Item 9 positive → same-day risk assessment.
• **GAD-7** (0–21): ≥10 clinical cutoff.
• **PCL-5** (0–80): 31–33 provisional PTSD cutoff; watch cluster scores.
• **AUDIT** (0–40): ≥8 hazardous, ≥20 evaluate dependence.
• **DAST-10**: ≥3 intensive assessment.
• **C-SSRS**: ideation level 4–5 (intent/plan) = acute risk protocol.
• **ACE** (0–10): ≥4 = strong dose-response history marker, not a symptom score.
• **ORS/SRS** (0–40): ORS <25 clinical; SRS <36 = discuss the alliance.
Two rules: never interpret a single administration in isolation (trend > point), and never let a low score override clinical observation — instruments screen, clinicians assess.`,
  },
  {
    id: 'kb-write-clinically', title: 'How do I write this clinically?', tags: ['documentation', 'language', 'writing'],
    body: `Translation patterns for professional documentation:
• "Client was a mess" → "Client presented with disheveled appearance, tearful affect, and pressured speech."
• "Client lied about drinking" → "Client's self-report of alcohol use was inconsistent with collateral information/toxicology."
• "Client was manipulative" → "Client engaged in indirect help-seeking behaviors; needs were expressed through escalation rather than direct request."
• "Client didn't do homework" → "Client did not complete the between-session assignment; barriers explored included…"
• "Session went nowhere" → "Client demonstrated limited engagement with the planned intervention; clinician shifted to alliance-building and validation."
Principles: behavioral and observable over judgmental; quotes for high-stakes statements (risk, abuse disclosures) verbatim; hypotheses labeled as such ("presentation is consistent with…", "clinician hypothesizes…"); every risk mention paired with assessment and action taken.`,
  },
  {
    id: 'kb-explain-simply', title: 'How do I explain this to the client in simple language?', tags: ['psychoeducation', 'language'],
    body: `Plain-language scripts for common concepts:
• **Window of tolerance**: "Everyone has a zone where they can feel things and still think. Trauma shrinks that zone. Our job is to widen it — not to make you feel less, but to make feelings survivable."
• **Anxiety loop**: "Avoiding scary things works great for about an hour, and terribly for years. Every avoidance teaches your brain the danger was real."
• **Depression spiral**: "Depression tells you to wait until you feel like doing things. But in depression, action comes first and motivation follows — like starting a cold engine."
• **Addiction function**: "The substance was never the problem it looked like — it was your solution to a problem nobody could see. We need a better solution before we take away the old one."
• **Attachment**: "Kids learn rules about closeness before they learn words. You're not broken — you're following rules that made sense in the house you grew up in."
• **Parts**: "Part of you wants to change and part of you is scared to — both parts are trying to protect you. Let's get them talking."`,
  },
  {
    id: 'kb-update-plan', title: 'How do I update this treatment plan?', tags: ['treatment plan', 'documentation'],
    body: `Update the plan — don't rewrite history. Good practice:
1. Review each objective: met / progressing / stalled / no longer relevant. Date each status.
2. Met objectives graduate to maintenance language; stalled objectives get a barrier analysis (skill gap? readiness? wrong objective?) before replacement.
3. New clinical information (new diagnosis, relapse, disclosure) changes the *formulation* first — then let the changed formulation justify the plan change. Document that chain.
4. Keep the old plan version; regulators and continuity of care both want to see evolution, not overwriting.
5. Re-anchor medical necessity: current symptoms → functional impairment → intervention → measurable target.
In this app, generating a new plan preserves prior versions automatically under the client's Treatment Plan tab.`,
  },
  {
    id: 'kb-assess-next', title: 'What should I assess next?', tags: ['assessment', 'planning'],
    body: `A rough assessment-coverage checklist — scan the client's record for gaps:
• **Risk**: current C-SSRS or equivalent? Means access asked directly? DV screening?
• **Mood/anxiety**: baseline + trending PHQ-9/GAD-7?
• **Trauma**: screening (PC-PTSD-5/PCL-5) even if they came in for something else? ACEs context?
• **Substances**: AUDIT/DAST asked matter-of-factly? Include cannabis, prescriptions, nicotine.
• **Medical**: sleep, pain, thyroid, medications with psychiatric side effects; last physical?
• **Functioning**: work, relationships, ADLs — severity ≠ impairment.
• **Alliance**: are you measuring it (SRS) or assuming it?
• **Strengths/protective**: explicitly assessed, or only pathology?
The next assessment is usually the one whose absence you'd have trouble defending in a chart review.`,
  },
  {
    id: 'kb-risk-protocol', title: 'Risk assessment reminders', tags: ['risk', 'safety', 'si', 'protocol'],
    body: `Core reminders (adapt to your setting's protocol and jurisdiction):
• Ask **directly** ("Have you had thoughts of killing yourself?") — asking does not plant ideation.
• Structure it: ideation → method → plan → intent → preparatory behavior → access to means → history of attempts (strongest single predictor).
• Protective factors matter but do not subtract from acute risk indicators.
• **Means restriction** is among the best-evidenced interventions — have the awkward conversation about firearms and medication stockpiles.
• Document: risk level, evidence for it, protective factors, actions taken (safety plan, consultation, means counseling, disposition), and rationale. "Low risk" without rationale is not an assessment.
• Reassess at transitions: discharge, level-of-care changes, post-hospitalization (highest-risk window), anniversaries, relapse.
• US crisis resources for clients: 988 Suicide & Crisis Lifeline (call/text), Crisis Text Line (text HOME to 741741), 911 for imminent danger.`,
  },
  {
    id: 'kb-mandated-reporting', title: 'Mandated reporting reminders', tags: ['legal', 'ethics', 'reporting'],
    body: `Jurisdiction-specific — verify your state/province requirements. General reminders:
• Typical triggers: reasonable suspicion of child abuse/neglect, elder/dependent-adult abuse, and (varies) threats toward identifiable victims (duty to warn/protect).
• You report **suspicion**, not proof — investigation is the agency's job.
• Know your timelines (many jurisdictions: immediate phone + written within 24–48h).
• Tell the client when clinically safe and legally permitted — reporting *with* transparency preserves more alliances than secret reporting.
• Consult (supervisor, ethics line, malpractice carrier legal line) and document the consultation.
• Informed-consent paperwork should have named these limits at intake; revisit verbally when material approaches them.`,
  },
  {
    id: 'kb-confidentiality', title: 'Privacy, consent & HIPAA-conscious practice', tags: ['hipaa', 'privacy', 'ethics', 'consent'],
    body: `Reminders for using this tool (and any tool) with client data:
• Prefer initials or codes over full names; the smallest identifying dataset that still serves care.
• This app stores data **encrypted, on this device only** by default. You control export, backup, and deletion. It does not transmit PHI unless you explicitly enable an online AI service in Settings — and it warns you first.
• A tool can support compliance but cannot confer it: HIPAA compliance lives in your policies, BAAs, device security, and workflows. If you enable any cloud service for PHI, you generally need a **Business Associate Agreement** with that vendor plus encryption in transit/at rest, access controls, and audit practice.
• Device hygiene: OS-level full-disk encryption, screen lock, no shared accounts, exported files stored to encrypted volumes and deleted after use.
• Informed consent should describe your documentation tools and any AI assistance in ways clients can understand.`,
  },
  {
    id: 'kb-stages-change', title: 'Stages of change & matching interventions', tags: ['sud', 'mi', 'stages of change'],
    body: `Match the intervention to the stage, not the diagnosis:
• **Precontemplation** — no problem perceived. Do: relationship, information *offered* not imposed, harm reduction. Don't: action plans, confrontation.
• **Contemplation** — ambivalent. Do: MI, decisional balance, discrepancy with values. Don't: cheerleading one side (they'll argue the other).
• **Preparation** — willing, needs a plan. Do: menu of options, small commitments, remove barriers.
• **Action** — doing it. Do: skills (RP, coping), reinforcement, structure.
• **Maintenance** — holding it. Do: identity/values work, lifestyle balance, RP refresh, prepare for lapse-vs-relapse thinking.
• **Recurrence** — not a stage failure but a re-entry point; shame reduction determines how fast they return.
Readiness fluctuates by the week — re-assess casually and often ("where's the dial today, 0–10?").`,
  },
  {
    id: 'kb-models', title: 'Model cheat-sheet: CBT, DBT, ACT, MI, psychodynamic, attachment, TIC', tags: ['models', 'theory'],
    body: `One-line change theories:
• **CBT** — feelings follow appraisals and behaviors; test the appraisal, change the behavior, mood follows.
• **DBT** — dysregulation = biology × invalidating environment; balance acceptance and change; skills fill the gap.
• **ACT** — suffering = avoidance + fusion; goal is psychological flexibility: feel more, fight less, act on values.
• **MI** — people believe what they hear themselves say; evoke their argument for change.
• **Psychodynamic** — today's symptoms are yesterday's solutions; make the pattern conscious inside a relationship that doesn't repeat it.
• **Attachment** — early bonds write the rules of closeness; a secure therapeutic base lets rules be rewritten.
• **Trauma-informed care** — ask "what happened to you," not "what's wrong with you"; safety, choice, collaboration, trustworthiness, empowerment before technique.
The model matters less than the match: client theory-of-problem × stage × your competence.`,
  },
  {
    id: 'kb-dap-vs-soap', title: 'DAP notes: what goes where', tags: ['documentation', 'dap'],
    body: `• **Data** — observable + reported: presentation, mood/affect (observed vs stated), participation, symptoms since last session, direct quotes for load-bearing statements, interventions delivered, themes. No interpretation yet.
• **Assessment** — your clinical thinking: progress toward each active goal, response to interventions, barriers, insight/motivation, risk status (always address it, even to note its absence), pattern-level observations, and any formulation update.
• **Plan** — concrete and next-session-checkable: interventions to continue/adjust, assignments given, safety plan status, referrals/coordination, focus for next session, next appointment.
The classic failure is assessment content leaking into Data ("client was resistant") — keep Data filmable: what a camera would have recorded plus what the client stated.`,
  },
  {
    id: 'kb-rupture-repair', title: 'How do I repair an alliance rupture?', tags: ['alliance', 'rupture', 'relationship'],
    body: `Ruptures come in two flavors: **withdrawal** (client goes quiet, compliant, late, "fine") and **confrontation** (anger at you, the bill, the model). Both are clinical gold if metabolized:
1. Notice and name, non-defensively: "Something shifted just now — did I miss you?"
2. Take your share genuinely (not performatively): "I pushed the worksheet when you needed me to just hear it. That was my mistake."
3. Explore the relational meaning: "What did it feel like when I did that?" — often it's the childhood pattern live in the room.
4. Re-negotiate the work: adjust pace, goals, or method visibly.
5. Afterward, connect it to the formulation — how the client handles rupture with *you* predicts their outside relationships.
SRS below 36, missed sessions, or new "forgetting" of homework are rupture smoke alarms.`,
  },
  {
    id: 'kb-countertransference', title: 'Using countertransference as data', tags: ['countertransference', 'psychodynamic', 'supervision'],
    body: `Your reactions in the room are instrumentation, not noise:
• Bored/sleepy with this client → possibly their affect is walled off (avoidant strategy) or you're being lulled away from something.
• Working harder than the client → their helplessness may recruit rescuers everywhere; who else carries them?
• Dreading the session → what interpersonal move do they make that you brace against? Others likely brace too.
• Feeling special/idealized → the crash usually follows; prepare for devaluation without retaliating.
• Irritated by "manipulation" → translate: indirect influence is the strategy of people who learned direct asking was dangerous.
Rule: notice privately → hypothesize about the client's relational world → verify with pattern evidence → only then (maybe) use in session. Recurrent hot reactions belong in supervision/consultation.`,
  },
  {
    id: 'kb-nci', title: 'Behavior-profiling frameworks (NCI / Behavior Ops) — how this app handles them', tags: ['nci', 'profiling', 'chase hughes'],
    body: `Chase Hughes’ NCI and Behavior Operations material is proprietary and this app does not reproduce or invent its definitions. Instead, Settings → Profiling Framework lets you enter **your own rubric** — your licensed definitions, scoring anchors, and behavioral markers for NCI-1 through NCI-4 (or any framework you use). Once defined, each client's Profile tab exposes structured fields scored against *your* rubric, and generated documents describe observations in clinical, ethical, non-manipulative language (observable behavior → hypothesis → treatment relevance). Use such frameworks to deepen attunement and safety — never to covertly influence. If you haven't licensed/learned the source material, leave this off; the core clinical profile covers the same ground through standard constructs.`,
  },
  {
    id: 'kb-documentation-defense', title: 'Documentation that protects you and the client', tags: ['documentation', 'legal', 'audit'],
    body: `Chart-review-proof habits:
• Every risk mention → assessment → action → rationale, same note.
• Late entries labeled as late; never edit silently (this app versions instead of overwriting).
• Quote high-stakes client statements verbatim with quotation marks.
• Medical necessity chain in every plan/review: diagnosis → symptoms → functional impairment → intervention → measurable goal.
• Missed sessions and outreach attempts documented.
• Consultations documented (who, when, gist) — consultation is your best liability protection and your best care protection; they're the same thing.
• Write every note as if the client will read it (in many jurisdictions they can): honest, respectful, jargon-explained.`,
  },
];

/* ---------------- phrase banks for the drafting engine ---------------- */
CC.PHRASES = {
  moodObserved: ['euthymic', 'dysphoric', 'anxious', 'irritable', 'flat', 'bright', 'labile', 'depressed'],
  affectObserved: ['congruent with stated mood', 'constricted', 'blunted', 'full-range', 'labile', 'guarded', 'tearful at intervals'],
  engagement: ['engaged and cooperative', 'initially guarded, warming over the session', 'cooperative but superficial', 'actively engaged, self-disclosing', 'restless with variable engagement', 'withdrawn with minimal spontaneous speech'],
  hierarchyNeeds: [
    { key: 'safety',      label: 'Safety and stabilization' },
    { key: 'si',          label: 'Suicidal ideation / self-harm risk' },
    { key: 'sud',         label: 'Substance-use risk and relapse prevention' },
    { key: 'trauma',      label: 'Trauma symptoms' },
    { key: 'regulation',  label: 'Emotional regulation' },
    { key: 'mood',        label: 'Depression / anxiety' },
    { key: 'relational',  label: 'Attachment and relational patterns' },
    { key: 'shame',       label: 'Shame and identity wounds' },
    { key: 'coping',      label: 'Coping skills' },
    { key: 'meaning',     label: 'Long-term meaning, values, and life direction' },
  ],
};

/* Diagnosis group inference — maps free-text dx labels to engine tags */
CC.DX_GROUPS = [
  { re: /(depress|mdd|dysthym|persistent depressive|mood disorder)/i, tag: 'depression' },
  { re: /(anxiet|gad|panic|phobia|social anx|ocd|obsessive)/i, tag: 'anxiety' },
  { re: /(ptsd|trauma|stress disorder|adjustment)/i, tag: 'ptsd' },
  { re: /(alcohol|substance|opioid|stimulant|cannabis|use disorder|addiction|aud\b|sud\b)/i, tag: 'sud' },
  { re: /(borderline|personality|bpd|npd)/i, tag: 'personality' },
  { re: /(bipolar|mania|manic)/i, tag: 'bipolar' },
  { re: /(psychosis|schizo)/i, tag: 'psychosis' },
  { re: /(adhd|attention)/i, tag: 'adhd' },
  { re: /(eating|anorexi|bulimi|binge)/i, tag: 'eating' },
];

CC.dxTags = function (client) {
  const tags = new Set();
  (client.diagnoses || []).forEach(d => {
    if (d.status === 'ruled-out') return;
    CC.DX_GROUPS.forEach(g => { if (g.re.test(d.label)) tags.add(g.tag); });
  });
  return tags;
};
