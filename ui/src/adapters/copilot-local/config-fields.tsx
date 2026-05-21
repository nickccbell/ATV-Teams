import type { AdapterConfigFieldsProps } from "../types";
import { Field, DraftInput } from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

const instructionsFileHint =
  "Absolute path to a markdown file (e.g. AGENTS.md) that defines this agent's behavior. Prepended to the prompt at runtime.";

const credentialSecretKeyHint =
  "Company-secrets key under which this agent's GitHub Copilot OAuth token is stored. Default: `copilot_oauth_token`. Complete the device flow from the Copilot connection panel before running this agent.";

export function CopilotLocalConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  hideInstructionsFile,
}: AdapterConfigFieldsProps) {
  return (
    <>
      {!hideInstructionsFile && (
        <Field label="Agent instructions file" hint={instructionsFileHint}>
          <div className="flex items-center gap-2">
            <DraftInput
              value={
                isCreate
                  ? values!.instructionsFilePath ?? ""
                  : eff(
                      "adapterConfig",
                      "instructionsFilePath",
                      String(config.instructionsFilePath ?? ""),
                    )
              }
              onCommit={(v) =>
                isCreate
                  ? set!({ instructionsFilePath: v })
                  : mark("adapterConfig", "instructionsFilePath", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="/absolute/path/to/AGENTS.md"
            />
            <ChoosePathButton />
          </div>
        </Field>
      )}
      {!isCreate && (
        <Field label="OAuth credential secret key" hint={credentialSecretKeyHint}>
          <DraftInput
            value={eff(
              "adapterConfig",
              "credentialSecretKey",
              String(config.credentialSecretKey ?? ""),
            )}
            onCommit={(v) =>
              mark("adapterConfig", "credentialSecretKey", v || undefined)
            }
            immediate
            className={inputClass}
            placeholder="copilot_oauth_token"
          />
        </Field>
      )}
    </>
  );
}
