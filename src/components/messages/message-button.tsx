import { startConversation } from "@/lib/messages/actions";
import { buttonClasses } from "@/components/ui/button";

// Opens (or creates) the one-to-one conversation with this student.
export function MessageButton({
  otherId,
  variant = "primary",
  size = "sm",
  fullWidth = false,
}: {
  otherId: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md";
  fullWidth?: boolean;
}) {
  return (
    <form action={startConversation.bind(null, otherId)} className={fullWidth ? "w-full" : undefined}>
      <button type="submit" className={buttonClasses({ variant, size, fullWidth })}>
        Message
      </button>
    </form>
  );
}
