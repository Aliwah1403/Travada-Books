import { useState } from "react";
import * as Sentry from "@sentry/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Badge } from "@travada-books/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@travada-books/ui/components/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@travada-books/ui/components/alert-dialog";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@travada-books/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@travada-books/ui/components/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate } from "@/hooks/use-format-date";
import { supabase } from "@/lib/supabase";
import {
  listTeamMembers,
  listTeamInvitations,
  inviteMember,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  renewInvitation,
  type TeamMember,
  type TeamInvitation,
} from "@/lib/queries/team";

function getInitials(name: string | null, email: string | null) {
  const src = name || email || "";
  return src
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
}


function expiryLabel(expiresAt: string | null): {
  text: string;
  expired: boolean;
} {
  if (!expiresAt) return { text: "No expiry", expired: false };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { text: "Expired", expired: true };
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return {
    text: `Expires in ${days} day${days === 1 ? "" : "s"}`,
    expired: false,
  };
}

// ─── Dots icon ───────────────────────────────────────────────────────────────

function DotsIcon() {
  return (
    <svg
      width='15'
      height='15'
      viewBox='0 0 15 15'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className='size-4'
    >
      <path
        d='M3.625 7.5a.875.875 0 1 1-1.75 0 .875.875 0 0 1 1.75 0Zm4.25 0a.875.875 0 1 1-1.75 0 .875.875 0 0 1 1.75 0Zm3.375.875a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z'
        fill='currentColor'
      />
    </svg>
  );
}

// ─── Invite dialog ──────────────────────────────────────────────────────────

function InviteDialog({
  orgId,
  onInvited,
}: {
  orgId: string;
  onInvited: () => void;
}) {
  const { profile, org } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "member">("member");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error("Please enter an email address.");
      const id = await inviteMember(orgId, email, role);
      const inviterName = profile?.full_name || org?.name || "";
      const { error: invokeError } = await supabase.functions.invoke("invite-member", {
        body: {
          invitations: [{ email: email.trim().toLowerCase(), id }],
          inviterName,
        },
      });
      return { emailFailed: !!invokeError };
    },
    onSuccess: ({ emailFailed }) => {
      if (emailFailed) {
        toast.warning(`Invite created for ${email.trim()}, but the email failed to send. Use "Resend invitation" from the Invitations tab to retry.`);
      } else {
        toast.success(`Invite sent to ${email.trim()}.`);
      }
      setEmail("");
      setRole("member");
      setOpen(false);
      onInvited();
    },
    onError: (err) => {
      Sentry.captureException(err);
      toast.error("Failed to send invite. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size='sm' />}>Invite member</DialogTrigger>
      <DialogContent className='md:max-w-md'>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            They'll receive an email invite to join your organisation.
            Invitations expire after 7 days.
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='invite-email'>Email address</Label>
            <Input
              id='invite-email'
              type='email'
              placeholder='teammate@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") mutation.mutate();
              }}
              autoFocus
            />
          </div>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='invite-role'>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "owner" | "member")}
            >
              <SelectTrigger id='invite-role' className='w-1/2'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='member'>Member</SelectItem>
                <SelectItem value='owner'>Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant='outline' size='sm' />}>
            Cancel
          </DialogClose>
          <Button
            size='sm'
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Members tab ─────────────────────────────────────────────────────────────

function MembersTab({
  members,
  currentUserId,
  isOwner,
  onRoleChange,
  onRemove,
  onLeave,
}: {
  members: TeamMember[];
  currentUserId: string;
  isOwner: boolean;
  onRoleChange: (memberId: string, role: string) => void;
  onRemove: (member: TeamMember) => void;
  onLeave: (member: TeamMember) => void;
}) {
  const { formatMonthDay } = useFormatDate();
  const [confirmState, setConfirmState] = useState<{
    type: "remove" | "leave";
    member: TeamMember;
  } | null>(null);

  const ownerCount = members.filter((m) => m.role === "owner").length;

  if (!members.length) {
    return (
      <div className='rounded-lg border border-dashed p-10 text-center'>
        <p className='text-sm font-medium'>No members yet</p>
      </div>
    );
  }

  return (
    <>
      <div className='flex flex-col divide-y'>
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId;
          const isLastOwner = member.role === "owner" && ownerCount === 1;
          // Owners can't act on the last owner. Members can only act on themselves.
          const cannotAct = isOwner ? isLastOwner : !isCurrentUser;

          return (
            <div key={member.id} className='flex items-center gap-4 py-3'>
              <Avatar className='size-8 shrink-0'>
                <AvatarImage src={member.avatar_url ?? undefined} />
                <AvatarFallback className='text-xs'>
                  {getInitials(member.full_name, member.email)}
                </AvatarFallback>
              </Avatar>

              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium truncate'>
                    {member.full_name || member.email || "Unknown"}
                  </span>
                  {isCurrentUser && (
                    <Badge variant='secondary' className='text-[10px] shrink-0'>
                      You
                    </Badge>
                  )}
                </div>
                {member.full_name && (
                  <p className='text-xs text-muted-foreground truncate'>
                    {member.email}
                  </p>
                )}
              </div>

              <div className='flex items-center gap-3 shrink-0'>
                <span className='text-xs text-muted-foreground hidden sm:block'>
                  Joined {formatMonthDay(member.created_at)}
                </span>

                {!isOwner || cannotAct ?
                  <Badge variant='outline' className='text-xs'>
                    {member.role === "owner" ? "Owner" : "Member"}
                  </Badge>
                : <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge
                        variant='outline'
                        className='text-xs cursor-pointer select-none hover:bg-muted transition-colors'
                      >
                        {member.role === "owner" ? "Owner" : "Member"}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-36'>
                      <DropdownMenuItem
                        className='text-xs'
                        disabled={member.role === "owner"}
                        onClick={() => onRoleChange(member.id, "owner")}
                      >
                        Owner
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='text-xs'
                        disabled={member.role === "member"}
                        onClick={() => onRoleChange(member.id, "member")}
                      >
                        Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }

                {/* Members only see the Leave action on their own row; owners see all actions */}
                {(!isOwner && !isCurrentUser) ? null : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-7'
                        disabled={cannotAct}
                      >
                        <span className='sr-only'>Actions</span>
                        <DotsIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                      {isCurrentUser ?
                        <DropdownMenuItem
                          className='text-destructive focus:text-destructive'
                          onClick={() =>
                            setConfirmState({ type: "leave", member })
                          }
                        >
                          Leave team
                        </DropdownMenuItem>
                      : <DropdownMenuItem
                          className='text-destructive focus:text-destructive'
                          onClick={() =>
                            setConfirmState({ type: "remove", member })
                          }
                        >
                          Remove member
                        </DropdownMenuItem>
                      }
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirmState(null)}
          title={
            confirmState.type === "leave" ? "Leave team?" : "Remove member?"
          }
          description={
            confirmState.type === "leave" ?
              "You'll lose access to this organisation immediately. You'll need a new invitation to rejoin."
            : `${confirmState.member.full_name || confirmState.member.email || "This member"} will lose access immediately.`
          }
          confirmLabel={confirmState.type === "leave" ? "Leave" : "Remove"}
          onConfirm={() => {
            if (confirmState.type === "leave") {
              onLeave(confirmState.member);
            } else {
              onRemove(confirmState.member);
            }
            setConfirmState(null);
          }}
        />
      )}
    </>
  );
}

// ─── Invitations tab ─────────────────────────────────────────────────────────

function InvitationsTab({
  invitations,
  onCancel,
  onResend,
}: {
  invitations: TeamInvitation[];
  onCancel: (inv: TeamInvitation) => void;
  onResend: (inv: TeamInvitation) => void;
}) {
  const { formatMonthDay } = useFormatDate();
  if (!invitations.length) {
    return (
      <div className='rounded-lg border border-dashed p-10 text-center'>
        <p className='text-sm font-medium'>No pending invitations</p>
        <p className='text-xs text-muted-foreground mt-1'>
          Invite a team member to get started.
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col divide-y'>
      {invitations.map((inv) => {
        const { text: expiry, expired } = expiryLabel(inv.expires_at);

        return (
          <div key={inv.id} className='flex items-center gap-4 py-3'>
            <Avatar className='size-8 shrink-0'>
              <AvatarFallback className='text-xs'>
                {getInitials(null, inv.email)}
              </AvatarFallback>
            </Avatar>

            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium truncate'>{inv.email}</p>
              <p className='text-xs text-muted-foreground'>
                Invited {formatMonthDay(inv.created_at)}
              </p>
            </div>

            <div className='flex items-center gap-2 shrink-0'>
              <Badge
                variant='ghost'
                className={
                  expired ?
                    "text-xs text-destructive"
                  : "text-xs text-amber-600 "
                }
              >
                {expiry}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon' className='size-7'>
                    <span className='sr-only'>Actions</span>
                    <DotsIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-full'>
                  <DropdownMenuItem onClick={() => onResend(inv)}>
                    Resend invitation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className='text-destructive focus:text-destructive'
                    onClick={() => onCancel(inv)}
                  >
                    Cancel invitation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function TeamSettingsPage() {
  const { orgId, orgRole, user, profile, org } = useAuth();
  const isOwner = orgRole === "owner";
  const queryClient = useQueryClient();
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState("");

  const membersQuery = useQuery({
    queryKey: ["team-members", orgId],
    queryFn: () => listTeamMembers(orgId!),
    enabled: !!orgId,
  });

  const invitationsQuery = useQuery({
    queryKey: ["team-invitations", orgId],
    queryFn: () => listTeamInvitations(orgId!),
    enabled: isOwner && !!orgId,
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", orgId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", orgId] });
    },
    onError: (err) => {
      Sentry.captureException(err);
      toast.error("Failed to remove member. Please try again.");
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err) => {
      Sentry.captureException(err);
      toast.error("Failed to leave team. Please try again.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations", orgId] });
    },
    onError: (err) => {
      Sentry.captureException(err);
      toast.error("Failed to cancel invitation. Please try again.");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (inv: TeamInvitation) => {
      const inviterName = profile?.full_name || org?.name || "";
      const { error: invokeError } = await supabase.functions.invoke("invite-member", {
        body: { invitations: [{ email: inv.email, id: inv.id }], inviterName },
      });
      if (invokeError) throw new Error("Failed to send invite email. Please try again.");
      await renewInvitation(inv.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invitations", orgId] });
    },
  });

  function handleRemove(member: TeamMember) {
    toast.promise(removeMutation.mutateAsync(member.id), {
      loading: "Removing member…",
      success: "Member removed.",
      error: (err) => String(err),
    });
  }

  function handleLeave(member: TeamMember) {
    toast.promise(leaveMutation.mutateAsync(member.id), {
      loading: "Leaving team…",
      success: "You have left the team.",
      error: (err) => String(err),
    });
  }

  function handleCancel(inv: TeamInvitation) {
    toast.promise(cancelMutation.mutateAsync(inv.id), {
      loading: "Cancelling invitation…",
      success: "Invitation cancelled.",
      error: (err) => String(err),
    });
  }

  const deleteOrgMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Not authenticated")
      if (!orgId) throw new Error("No organisation selected")
      const res = await supabase.functions.invoke("delete-organisation", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { org_id: orgId },
      })
      if (res.error) throw new Error(res.error.message)
      const body = res.data as { error?: string }
      if (body?.error) throw new Error(body.error)
    },
    onSuccess: () => {
      window.location.href = "/onboarding/org"
    },
    onError: (err) => {
      Sentry.captureException(err)
      toast.error("Failed to delete organisation. Please try again.")
    },
  });

  const members = membersQuery.data ?? [];
  const invitations = invitationsQuery.data ?? [];

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex items-start justify-between'>
        <div>
          <h2 className='text-sm font-semibold'>Team</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {isOwner ?
              "Manage users who have access to this team."
            : "View your team members. You can leave the team from here."}
          </p>
        </div>
        {isOwner && orgId && (
          <InviteDialog
            orgId={orgId}
            onInvited={() => {
              queryClient.invalidateQueries({
                queryKey: ["team-invitations", orgId],
              });
            }}
          />
        )}
      </div>

      <Tabs defaultValue='members'>
        <TabsList>
          <TabsTrigger value='members'>
            Members
            {members.length > 0 && (
              <span className='ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium'>
                {members.length}
              </span>
            )}
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value='invitations'>
              Invitations
              {invitations.length > 0 && (
                <span className='ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium'>
                  {invitations.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value='members' className='mt-4'>
          {membersQuery.isLoading ?
            <div className='py-10 text-center text-sm text-muted-foreground'>
              Loading…
            </div>
          : <MembersTab
              members={members}
              currentUserId={user?.id ?? ""}
              isOwner={isOwner}
              onRoleChange={(memberId, role) =>
                toast.promise(roleChangeMutation.mutateAsync({ memberId, role }), {
                  loading: "Updating role…",
                  success: "Role updated.",
                  error: (err) => String(err),
                })
              }
              onRemove={handleRemove}
              onLeave={handleLeave}
            />
          }
        </TabsContent>

        {isOwner && (
          <TabsContent value='invitations' className='mt-4'>
            {invitationsQuery.isLoading ?
              <div className='py-10 text-center text-sm text-muted-foreground'>
                Loading…
              </div>
            : <InvitationsTab
                invitations={invitations}
                onCancel={handleCancel}
                onResend={(inv) =>
                  toast.promise(resendMutation.mutateAsync(inv), {
                    loading: "Resending invite…",
                    success: `Invite resent to ${inv.email}.`,
                    error: (err) => String(err),
                  })
                }
              />
            }
          </TabsContent>
        )}
      </Tabs>

      {isOwner && (
        <>
          <Separator />
          <section className='flex flex-col gap-5'>
            <div>
              <h2 className='text-sm font-semibold text-destructive'>Delete organisation</h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Permanently delete this organisation and all its data — invoices, quotes, and
                customers. All members will lose access immediately. This cannot be undone.
              </p>
            </div>

            <AlertDialog onOpenChange={(open) => { if (!open) setDeleteOrgConfirm("") }}>
              <AlertDialogTrigger asChild>
                <Button variant='destructive' size='sm' className='w-fit'>
                  Delete organisation
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{org?.name}</strong> and all its invoices,
                    quotes, and customer data. All members will lose access immediately. This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className='flex flex-col gap-1.5 mt-2'>
                  <Label htmlFor='delete-org-confirm'>
                    Type <span className='font-semibold'>DELETE</span> to confirm
                  </Label>
                  <Input
                    id='delete-org-confirm'
                    value={deleteOrgConfirm}
                    onChange={(e) => setDeleteOrgConfirm(e.target.value)}
                    placeholder='DELETE'
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className='bg-destructive text-white hover:bg-destructive/90'
                    disabled={deleteOrgConfirm !== "DELETE" || deleteOrgMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault()
                      deleteOrgMutation.mutate()
                    }}
                  >
                    {deleteOrgMutation.isPending ? "Deleting…" : "Delete organisation"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </>
      )}
    </div>
  );
}
