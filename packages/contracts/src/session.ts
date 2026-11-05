import { z } from 'zod';
import type { IsoDateTime } from './shared.js';
import type { Permission, User } from './team.js';

export interface Company {
  name: string;
  legalName: string;
  industry: string;
  location: string;
  /** Short mark shown in the workspace switcher. */
  initials: string;
}

export interface Session {
  company: Company;
  user: User;
  permissions: Permission[];
  personas: User[];
  sandboxCreatedAt: IsoDateTime;
}

export const SwitchPersonaSchema = z.object({ userId: z.string().min(1) });
export type SwitchPersonaInput = z.infer<typeof SwitchPersonaSchema>;
