import { ActionTakenStatus, TicketStatus } from '@prisma/client';
import { bodyFields, integer, invalid } from './ticketWrites';

export const ACTIVE_TICKETS: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'];
export const ACTION_TRANSITIONS: Record<ActionTakenStatus, ActionTakenStatus[]> = {
  PLANNED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'], IN_PROGRESS: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [],
};
export interface ActionInput {
  description: string; result: string | null; assigneeId: number; status: ActionTakenStatus;
  followUpRequired: boolean; followUpNote: string | null; attachmentNotes: string | null; cancelReason: string | null;
}
const editable = ['description', 'result', 'assigneeId', 'status', 'followUpRequired', 'followUpNote', 'attachmentNotes', 'cancelReason'];
export function actionBody(raw: unknown, create: boolean) {
  return bodyFields(raw, [...editable.filter(f => !create || f !== 'cancelReason'), 'ticketVersion', ...(create ? ['clientRequestId'] : ['version'])]);
}

function text(value: unknown, field: string, required = false): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) invalid(field, 'Enter 2 to 2,000 characters.');
    return null;
  }
  if (typeof value !== 'string') invalid(field, 'A string is required.');
  const trimmed = value.trim();
  if (!trimmed && !required) return null;
  if (trimmed.length < 2 || trimmed.length > 2000) invalid(field, 'Enter 2 to 2,000 characters.');
  return trimmed;
}

export function normalizeAction(body: Record<string, unknown>, base: Partial<ActionInput>, actorId: number): ActionInput {
  const merged = { description: undefined, result: null, assigneeId: actorId, status: 'PLANNED',
    followUpRequired: false, followUpNote: null, attachmentNotes: null, cancelReason: null, ...base, ...body };
  if (typeof merged.status !== 'string' || !Object.values(ActionTakenStatus).includes(merged.status as ActionTakenStatus)) invalid('status', 'Choose a valid action status.');
  if (typeof merged.followUpRequired !== 'boolean') invalid('followUpRequired', 'A JSON boolean is required.');
  const followUpNote = text(merged.followUpNote, 'followUpNote', merged.followUpRequired);
  return {
    description: text(merged.description, 'description', true)!,
    result: text(merged.result, 'result', merged.status === 'COMPLETED'),
    assigneeId: integer(merged.assigneeId, 'assigneeId'), status: merged.status as ActionTakenStatus,
    followUpRequired: merged.followUpRequired, followUpNote: merged.followUpRequired ? followUpNote : null,
    attachmentNotes: text(merged.attachmentNotes, 'attachmentNotes'),
    cancelReason: text(merged.cancelReason, 'cancelReason', merged.status === 'CANCELLED'),
  };
}
