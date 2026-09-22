const { z, ZodError } = require('zod');
const schema = z.object({ name: z.string() });
try {
  schema.parse({});
} catch (e) {
  console.log(e instanceof ZodError);
  console.log(e.errors ? 'Has errors array' : 'No errors array');
  console.log(e.issues ? 'Has issues array' : 'No issues array');
  console.log(e);
}
