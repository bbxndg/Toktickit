import { createHash } from 'node:crypto';
import { ActionTakenStatus, PrismaClient, Role, TicketStatus } from '@prisma/client';
import { hashPassword } from '../src/utils/auth';

// Stable demo keys create fixtures once. Reruns retain edited work and credentials.
export async function seedLab4(prisma: PrismaClient) {
  const user = (name: string, email: string, role: Role, isActive = true) => prisma.user.upsert({ where: { email }, update: {},
    create: { name, email, role, isActive, isPasswordChangeRequired: true, passwordHash: hashPassword('Password123!') } });
  const requester = await user('Lab 4 Requester', 'lab4.requester@toktickit.local', Role.REQUESTER);
  await user('Lab 4 Empty Requester', 'lab4.empty@toktickit.local', Role.REQUESTER);
  const staff = await user('Lab 4 Support', 'lab4.staff@toktickit.local', Role.IT_STAFF);
  const colleague = await user('Lab 4 Network Specialist', 'lab4.network@toktickit.local', Role.IT_STAFF);
  await user('Lab 4 Unassigned Staff', 'lab4.no-actions@toktickit.local', Role.IT_STAFF);
  await user('Lab 4 Inactive Staff', 'lab4.inactive@toktickit.local', Role.IT_STAFF, false);
  const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });
  const statuses = Object.values(TicketStatus);
  for (const [index, status] of statuses.entries()) {
    const ticketNumber = `TKT-2026-${900001 + index}`;
    await prisma.$transaction(async tx => {
      const existing = await tx.ticket.findUnique({ where: { ticketNumber } });
      if (existing) {
        if (!existing.summary.startsWith('[Lab 4 Demo]')) throw new Error(`Demo Ticket number ${ticketNumber} is already in use. No existing Ticket was changed.`);
        return;
      }
      const resolved = status === 'RESOLVED' || status === 'CLOSED';
      const firstInsertedAt = new Date();
      const ticket = await tx.ticket.create({ data: { ticketNumber, summary: `[Lab 4 Demo] ${status.replace(/_/g, ' ')} campus Wi-Fi support`,
        description: 'Demonstrate independent Ticket ownership and work performed by different staff.', requesterId: requester.id,
        ownerId: index % 2 ? staff.id : null, status,
        resolvedAt: resolved ? firstInsertedAt : null, closedAt: status === 'CLOSED' ? firstInsertedAt : null,
        resolutionSummary: resolved ? 'Connectivity verified with the Requester.' : null, requestedPriority: (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)[index % 4],
        itPriority: index === 0 ? null : (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)[index % 4], categoryId: category.id, relatedSystemId: system.id } });
      const count = status === 'NEW' ? 0 : status === 'IN_PROGRESS' ? 3 : 1;
      for (let line = 0; line < count; line++) {
        const state: ActionTakenStatus = ['RESOLVED', 'CLOSED'].includes(status) || line === 1 ? 'COMPLETED'
          : status === 'CANCELLED' || line === 2 ? 'CANCELLED' : status === 'OPEN' ? 'PLANNED' : 'IN_PROGRESS';
        const assignee = line === 1 ? colleague : staff;
        if (!assignee.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(assignee.role)) throw new Error('Demo staff is no longer eligible; existing accounts were preserved.');
        const now = new Date();
        const description = ['Inspect adapter and signal strength', 'Reconfigure the access point', 'Replace the optional cable'][line];
        const result = state === 'COMPLETED' ? 'Verified connectivity with the Requester.' : null;
        const followUpRequired = state === 'IN_PROGRESS';
        const followUpNote = followUpRequired ? 'Check stability after the next restart.' : null;
        const input = { description, result, assigneeId: assignee.id, status: state, followUpRequired, followUpNote,
          attachmentNotes: 'See permitted Ticket attachments for supporting evidence.', cancelReason: state === 'CANCELLED' ? 'No longer needed after testing.' : null };
        await tx.actionTaken.create({ data: { ...input, ticketId: ticket.id, createdById: staff.id, updatedById: assignee.id,
          performedById: state === 'COMPLETED' ? assignee.id : null, completedAt: state === 'COMPLETED' ? now : null,
          cancelledAt: state === 'CANCELLED' ? now : null, actionAt: now, createdAt: now,
          clientRequestId: `ec4f0000-0000-4000-8000-${String(index * 10 + line + 1).padStart(12, '0')}`,
          requestFingerprint: createHash('sha256').update(JSON.stringify(input)).digest('hex') } });
      }
    });
  }
}
