import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Disable Next.js body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: ReadableStream) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing stripe signature or webhook secret' },
        { status: 400 }
      );
    }

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle specific events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Get the Clerk user ID from the metadata
    const clerkId = session.metadata?.clerkId;
    
    if (clerkId && session.payment_status === 'paid') {
      // User has successfully purchased the Pro plan
      console.log(`User ${clerkId} is now a Pro user!`);
      
      // In a real app, you would update user status in a database here
      // Since we're not using a database, we'll rely on checking payment status directly with Stripe
    }
  }

  return NextResponse.json({ received: true });
} 