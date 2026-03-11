export type FormFieldType = 
  | "text" 
  | "textarea" 
  | "select" 
  | "multiselect" 
  | "checkbox" 
  | "date" 
  | "signature";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export type IntakeFormStatus = "draft" | "active" | "archived";

export interface IntakeForm {
  id: string;
  locationSlug: string;
  name: string;
  description: string;
  status: IntakeFormStatus;
  fields: FormField[];
  assignedServices: string[];
  requiredForBooking: boolean;
  completionCount: number;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string;
}

type Awaitable<T> = T | Promise<T>;

export interface IntakeFormsRepository {
  save(form: IntakeForm): Awaitable<void>;
  get(id: string): Awaitable<IntakeForm | undefined>;
  listByLocation(locationSlug: string): Awaitable<IntakeForm[]>;
  listAll(): Awaitable<IntakeForm[]>;
  delete(id: string): Awaitable<void>;
}

const intakeForms = new Map<string, IntakeForm>();

export const createInMemoryIntakeFormsRepository = (): IntakeFormsRepository => ({
  save: (form) => {
    intakeForms.set(form.id, form);
  },
  get: (id) => intakeForms.get(id),
  listByLocation: (locationSlug) =>
    Array.from(intakeForms.values())
      .filter((form) => form.locationSlug === locationSlug)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  listAll: () =>
    Array.from(intakeForms.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ),
  delete: (id) => {
    intakeForms.delete(id);
  },
});
