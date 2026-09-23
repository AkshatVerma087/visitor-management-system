const { z } = require('zod');

exports.walkInSchema = z.object({
  visitor_name: z.string().min(2, 'Visitor name must be at least 2 characters'),
  visitor_email: z.string().email('Invalid visitor email address'),
  visitor_phone: z.string().optional(),
  company: z.string().optional(),
  purpose: z.string().optional(),
  host_id: z.string().uuid('Invalid host ID'),
  photo_url: z.string().min(1, 'Mandatory security photo is missing'),
  duration_hours: z.union([z.string(), z.number()]).optional()
});

exports.decisionSchema = z.object({
  decision: z.enum(['Approved', 'Rejected'], {
    errorMap: () => ({ message: "Decision must be 'Approved' or 'Rejected'" })
  }),
  idempotency_key: z.string().min(1, 'Invalid request parameters')
});
