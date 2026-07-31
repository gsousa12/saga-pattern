import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDbInstance } from "../../_common/db";
import { products } from "@orchestrator/db";

const createProductBodySchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  description: z.string().max(500).optional(),
});

type CreateProductBody = z.infer<typeof createProductBodySchema>;

export async function productsController(app: FastifyInstance) {
  app.get("/", async () => {
    const db = await getDbInstance();
    const allProducts = await db.select().from(products);
    return { products: allProducts };
  });

  app.post<{ Body: CreateProductBody }>("/", async (req, reply) => {
    const body = createProductBodySchema.parse(req.body);
    const db = await getDbInstance();

    const [product] = await db
      .insert(products)
      .values({
        name: body.name,
        price: body.price,
        description: body.description,
      })
      .returning();

    return reply.status(201).send(product);
  });
}
