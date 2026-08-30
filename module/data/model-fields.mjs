const fields = foundry.data.fields;

export const booleanField = (initial = false) => new fields.BooleanField({
  required: true,
  nullable: false,
  initial
});

export const integerField = (initial = 0, options = {}) => new fields.NumberField({
  required: true,
  nullable: false,
  integer: true,
  initial,
  ...options
});

export const numberField = (initial = 0, options = {}) => new fields.NumberField({
  required: true,
  nullable: false,
  initial,
  ...options
});

export const stringField = (initial = "", options = {}) => new fields.StringField({
  required: true,
  nullable: false,
  initial,
  ...options
});

export const nullableStringField = () => new fields.StringField({
  required: false,
  nullable: true,
  initial: null
});

export const nullableIntegerField = (options = {}) => new fields.NumberField({
  required: false,
  nullable: true,
  integer: true,
  initial: null,
  ...options
});

export const stringArrayField = () => new fields.ArrayField(
  new fields.StringField({required: true, nullable: false, blank: false}),
  {required: true, nullable: false, initial: []}
);

export const objectField = () => new fields.ObjectField({
  required: true,
  nullable: false,
  initial: {}
});

export const objectArrayField = () => new fields.ArrayField(
  new fields.ObjectField({required: true, nullable: false}),
  {required: true, nullable: false, initial: []}
);

export {fields};
