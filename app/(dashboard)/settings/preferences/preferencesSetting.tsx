import { useSession } from "@/components/useSession";
import AutoAssignSetting from "./autoAssignSetting";
import ConfettiSetting from "./confettiSetting";
import EmailEscalationSetting from "./emailEscalationSetting";
import NextTicketPreviewSetting from "./nextTicketPreviewSetting";

const PreferencesSetting = () => {
  const { user } = useSession() ?? {};

  if (!user) return null;

  return (
    <div className="space-y-6">
      <AutoAssignSetting />
      <ConfettiSetting />
      <NextTicketPreviewSetting />
      <EmailEscalationSetting />
    </div>
  );
};

export default PreferencesSetting;
