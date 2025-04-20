

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    // Check if the user is authenticated
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to access the billing portal.' },
        { status: 401 }
      );
    }

    const email = user.emailAddresses[0]?.emailAddress;
    
    // Find the customer in Stripe
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No subscription found for this account.' },
        { status: 404 }
      );
    }

    const customer = customers.data[0];
    
    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the billing portal session' },
      { status: 500 }
    );
  }
} 