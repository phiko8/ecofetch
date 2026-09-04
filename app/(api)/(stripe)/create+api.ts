import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const { amount, name, email } = await request.json();

    if (!amount) {
      return Response.json({ error: "Missing amount" }, { status: 400 });
    }

    // Find or create a Stripe customer
    let customerId: string | undefined;
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({ name, email });
        customerId = customer.id;
      }
    }

    // Create payment intent (amount in cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: "zar",
      customer: customerId,
      automatic_payment_methods: { enabled: true },
    });

    return Response.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Stripe create error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
