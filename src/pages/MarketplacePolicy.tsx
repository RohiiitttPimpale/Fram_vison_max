const MarketplacePolicy = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Marketplace Policy</h1>
        <p className="text-muted-foreground mt-1">Safety, quality, and fair-trade requirements for all listings.</p>
      </div>

      <div className="agri-card space-y-4 text-sm text-foreground leading-6">
        <section>
          <h2 className="font-semibold mb-1">1. Allowed Listings</h2>
          <p>You may list crops, seeds, and farm produce that you own or are authorized to sell.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">2. Prohibited Content</h2>
          <p>No illegal products, counterfeit seeds, misleading photos, duplicate spam listings, or abusive language.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">3. Pricing and Quantity Integrity</h2>
          <p>Price, quantity, and unit details must be accurate and updated if stock changes.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">4. Image and Description Quality</h2>
          <p>Use real photos of your listed produce. Descriptions should reflect actual quality and condition.</p>
        </section>

        <section>
          <h2 className="font-semibold mb-1">5. Moderation and Enforcement</h2>
          <p>Listings are moderated. We may approve, reject, or block listings that violate policy.</p>
        </section>
      </div>
    </div>
  );
};

export default MarketplacePolicy;
