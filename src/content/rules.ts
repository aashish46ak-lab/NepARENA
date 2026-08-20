/** Editable Rules & Regulations — keep practical and non-legalistic. */
export type RuleSection = {
  id: string;
  title: string;
  intro?: string;
  items: string[];
  highlight?: string;
};

export const RULES_INTRO =
  "These rules help keep NepARENA fair, safe, and enjoyable. Organizers may add tournament-specific rules on each event page. When in conflict, clearer tournament rules for that event still apply for that event—community rules always apply platform-wide.";

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: "community",
    title: "1. General Community Guidelines",
    items: [
      "Treat every player, organizer, and staff member with respect.",
      "Do not spam, scam, or mislead others on the platform.",
      "Do not impersonate organizers, staff, or other players.",
      "Use the platform for legitimate competition and community activity.",
    ],
    highlight: "Respect is non-negotiable.",
  },
  {
    id: "account",
    title: "2. Account & Profile Rules",
    items: [
      "Keep your account secure. You are responsible for activity under your login.",
      "Use accurate profile information needed for fair competition (e.g. in-game name where required).",
      "Do not create accounts solely to evade bans or manipulate results.",
      "Do not share accounts in a way that breaks tournament identity rules.",
    ],
  },
  {
    id: "participation",
    title: "3. Tournament Participation Rules",
    items: [
      "Register only if you can commit to the schedule and format.",
      "Follow the tournament’s registration, check-in, and eligibility requirements.",
      "One competitive identity per event unless the organizer explicitly allows otherwise.",
      "Read the event rules before the first matchday.",
    ],
  },
  {
    id: "match",
    title: "4. Match Rules",
    items: [
      "Play the correct opponent, competition settings, and format listed for the match.",
      "Do not delay matches without a valid reason communicated in time.",
      "In-game settings must match the tournament specification.",
      "Agree on lobby host and side selection only as the event rules allow.",
    ],
  },
  {
    id: "scheduling",
    title: "5. Scheduling & Deadlines",
    items: [
      "Respect published matchday windows and deadlines.",
      "If you need a reschedule, contact the opponent and organizer as early as possible.",
      "Missing a deadline without approved extension may result in a default.",
      "Organizers should publish clear times in a timezone players can understand.",
    ],
  },
  {
    id: "results",
    title: "6. Result Submission",
    items: [
      "Submit results honestly and on time through the platform when required.",
      "Both sides should confirm scores when the system asks for confirmation.",
      "Do not submit results for matches that were not played.",
      "If scores conflict, provide evidence and wait for organizer review.",
    ],
  },
  {
    id: "evidence",
    title: "7. Screenshot / Evidence Requirements",
    items: [
      "Keep clear end-screen or score evidence until the matchday is finalized.",
      "Evidence should show score, players/teams, and relevant match context.",
      "Edited, cropped, or misleading evidence may be rejected.",
      "Organizers may request additional proof when disputes arise.",
    ],
  },
  {
    id: "disconnect",
    title: "8. Disconnection Rules",
    items: [
      "If a disconnect happens, follow the event’s reconnect / remake policy.",
      "Do not claim disconnects to reset unfavorable matches.",
      "Report disconnects promptly with available evidence.",
      "Repeated suspicious disconnects may be treated as misconduct.",
    ],
  },
  {
    id: "default",
    title: "9. Default Win / Loss Rules",
    items: [
      "A default may be awarded if a player is absent past the allowed wait time.",
      "Organizers should state wait times clearly for each event.",
      "Defaults should be logged with a short reason.",
      "Appeals must include evidence of presence or agreed reschedule.",
    ],
  },
  {
    id: "cheating",
    title: "10. Cheating, Hacking & Exploitation",
    items: [
      "No cheats, hacks, third-party tools that alter fair play, or exploit abuse.",
      "No account boosting that violates event eligibility.",
      "No match-fixing or collusion.",
      "Cheating can lead to match forfeiture, event removal, or platform restrictions.",
    ],
    highlight: "Cheating has no place on NepARENA.",
  },
  {
    id: "toxicity",
    title: "11. Toxicity, Harassment & Abuse",
    items: [
      "No harassment, hate speech, threats, or targeted abuse.",
      "No doxxing or sharing private information without consent.",
      "Trash talk that crosses into personal attacks is not acceptable.",
      "Report abuse with context instead of escalating publicly.",
    ],
  },
  {
    id: "fairplay",
    title: "12. Fair Play",
    items: [
      "Compete honestly and accept legitimate results.",
      "Do not exploit bugs; report them to organizers or platform staff.",
      "Support a sportsmanlike environment for newcomers and veterans alike.",
    ],
  },
  {
    id: "player-resp",
    title: "13. Player Responsibilities",
    items: [
      "Know your match times and settings.",
      "Communicate clearly with opponents and organizers.",
      "Submit results and evidence as required.",
      "Follow both platform rules and event-specific rules.",
    ],
  },
  {
    id: "org-resp",
    title: "14. Organizer Responsibilities",
    items: [
      "Publish clear formats, rules, schedules, and prize information when applicable.",
      "Handle disputes with consistent standards.",
      "Avoid conflicts of interest when reviewing evidence.",
      "Use platform tools to keep fixtures and results transparent.",
    ],
  },
  {
    id: "reporting",
    title: "15. Reporting & Complaints",
    items: [
      "Use in-app report tools or organizer channels when available.",
      "Include match ID/time, opponent, and evidence.",
      "False reports intended to harass may themselves be penalized.",
      "Serious safety issues should be escalated promptly.",
    ],
  },
  {
    id: "review",
    title: "16. Evidence Review",
    items: [
      "Organizers/staff review available evidence before overturning a result.",
      "Decisions should be explained briefly to involved players when practical.",
      "Incomplete evidence may result in the original result standing.",
    ],
  },
  {
    id: "penalties",
    title: "17. Penalties & Disciplinary Actions",
    items: [
      "Possible actions include warnings, score adjustments, defaults, event removal, or account restrictions.",
      "Severity depends on intent, repetition, and impact on others.",
      "Penalties aim to protect fair competition, not to punish mistakes unfairly.",
    ],
  },
  {
    id: "appeals",
    title: "18. Appeals",
    items: [
      "Appeals should be submitted within the window set by the organizer or platform staff.",
      "Provide new or clearer evidence—not only disagreement.",
      "Final decisions after fair review should be respected.",
    ],
  },
  {
    id: "content",
    title: "19. Content / Posting Rules",
    items: [
      "No illegal, explicit, or harmful content.",
      "No spam, scam links, or misleading promotions.",
      "Respect others’ media and intellectual property.",
      "Organizer announcements should stay relevant to the community.",
    ],
  },
  {
    id: "privacy",
    title: "20. Privacy & Safety Expectations",
    items: [
      "Do not share others’ private data publicly.",
      "Be careful with personal information in profiles and chats.",
      "Report threats or safety concerns immediately.",
    ],
  },
  {
    id: "updates",
    title: "21. Rule Updates",
    items: [
      "Rules may be updated to improve clarity and fairness.",
      "Material changes should be reflected on this page.",
      "Continued use of the platform means you agree to follow the current published rules.",
    ],
  },
];
