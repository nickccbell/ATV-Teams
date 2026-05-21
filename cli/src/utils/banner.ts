import pc from "picocolors";

const ATV_TEAMS_ART = [
  " █████╗ ████████╗██╗   ██╗      ████████╗███████╗ █████╗ ███╗   ███╗███████╗",
  "██╔══██╗╚══██╔══╝██║   ██║      ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔════╝",
  "███████║   ██║   ██║   ██║ ████    ██║   █████╗  ███████║██╔████╔██║███████╗",
  "██╔══██║   ██║   ╚██╗ ██╔╝         ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║╚════██║",
  "██║  ██║   ██║    ╚████╔╝          ██║   ███████╗██║  ██║██║ ╚═╝ ██║███████║",
  "╚═╝  ╚═╝   ╚═╝     ╚═══╝           ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝",
] as const;

const TAGLINE = "Open-source orchestration for zero-human companies";

export function printPaperclipCliBanner(): void {
  const lines = [
    "",
    ...ATV_TEAMS_ART.map((line) => pc.cyan(line)),
    pc.blue("  ───────────────────────────────────────────────────────"),
    pc.bold(pc.white(`  ${TAGLINE}`)),
    "",
  ];

  console.log(lines.join("\n"));
}
