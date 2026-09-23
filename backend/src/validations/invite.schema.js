const { z } = require('zod');

exports.createInviteSchema = z.object({
  event_title: z.string().min(2, 'Event title is required'),
  visit_type: z.string().min(1, 'Visit type is required'),
  visit_date: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Invalid visit date' }),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid start time (HH:MM)'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid end time (HH:MM)'),
  note: z.string().optional(),
  visitors: z.array(
    z.object({
      visitor_name: z.string().min(2, 'Visitor name is required'),
      visitor_email: z.string().email('Invalid email'),
      visitor_phone: z.string().optional(),
      company: z.string().optional()
    })
  ).min(1, 'At least one visitor is required').max(5, 'Maximum of 5 visitors allowed'),
  timezone: z.string().optional()
});
