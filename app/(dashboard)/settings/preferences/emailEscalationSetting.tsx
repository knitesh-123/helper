"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";
import { SavingIndicator } from "@/components/savingIndicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import SectionWrapper from "../sectionWrapper";

const EmailEscalationSetting = () => {
  const utils = api.useUtils();
  const { data: mailbox } = api.mailbox.get.useQuery();
  const [emailRecipients, setEmailRecipients] = useState(mailbox?.emailEscalationRecipients ?? "");
  const savingIndicator = useSavingIndicator();

  const { mutate: update } = api.mailbox.update.useMutation({
    onSuccess: () => {
      utils.mailbox.get.invalidate();
      savingIndicator.setState("saved");
    },
    onError: (error) => {
      savingIndicator.setState("error");
      toast.error("Error updating email settings", { description: error.message });
    },
  });

  const handleBlur = () => {
    if (emailRecipients === (mailbox?.emailEscalationRecipients ?? "")) {
      return;
    }
    savingIndicator.setState("saving");
    update({
      emailEscalationRecipients: emailRecipients || null,
    });
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-4 z-10">
        <SavingIndicator state={savingIndicator.state} />
      </div>
      <SectionWrapper
        title="Daily Report Email Recipients"
        description="Receive daily report emails at these addresses"
      >
        <div className="grid gap-1">
          <Label htmlFor="email-recipients">Email addresses</Label>
          <Input
            id="email-recipients"
            type="text"
            placeholder="support@example.com, team@example.com"
            value={emailRecipients}
            onChange={(e) => setEmailRecipients(e.target.value)}
            onBlur={handleBlur}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Enter one or more email addresses separated by commas to receive daily reports.
          </p>
        </div>
      </SectionWrapper>
    </div>
  );
};

export default EmailEscalationSetting;

