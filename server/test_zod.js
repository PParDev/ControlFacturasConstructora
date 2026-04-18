import { z } from 'zod'
const schema = z.object({ a: z.number() })
try { schema.parse({ a: "1" }) } catch(e) { console.log(e.name, e.message) }
