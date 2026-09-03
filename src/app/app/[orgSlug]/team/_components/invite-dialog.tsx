"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Copy, Link2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InviteDialog() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("MEMBER");
  const [link, setLink] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  function generate() {
    // DEMO: a realistic-looking single-use token. With Supabase, the raw token is
    // returned exactly once; only its hash is stored server-side.
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    setLink(`${window.location.origin}/invite/${token}`);
    setCopied(false);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy — select and copy manually.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) { setLink(null); setEmail(""); setRole("MEMBER"); }
      }}
    >
      <DialogTrigger asChild>
        <Button><UserPlus className="size-4" /> Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            Generate a secure, single-use link and share it manually. Stackceipt doesn&apos;t send email in V1.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5">Email to invite</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
            <p className="mt-1 text-xs text-muted-foreground">The link only works for this email address.</p>
          </div>
          <div>
            <Label className="mb-1.5">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {link ? (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Link2 className="size-3.5" /> Invite link (expires in 7 days)</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy link">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Shown once. The raw token is never stored — only a hash.</p>
            </div>
          ) : (
            <Button
              type="button"
              className="w-full"
              disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)}
              onClick={generate}
            >
              Generate invite link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
