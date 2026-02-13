module.exports = function orderStatusTemplate({
  customerName,
  orderNumber,
  status,
  items,
  total,
}) {
  const logoUrl = "https://itarahome.com/logo.png";
  const orderUrl = `https://itarahome.com/dashboard/orders/${orderNumber}`;
  const backend_url=process.env.BACKEND_URL

  

  const statusConfig = {
    processing: {
      title: "🛠️ Order Processing",
      message: "Your order is currently being prepared. We’ll notify you once it’s shipped.",
      color: "#2563eb",
    },
    shipped: {
      title: "🚚 Order Shipped",
      message: "Great news! Your order is on the way.",
      color: "#f59e0b",
    },
    delivered: {
      title: "✅ Order Delivered",
      message: "Your order has been successfully delivered. We hope you love it!",
      color: "#16a34a",
    },
    cancelled: {
      title: "❌ Order Cancelled",
      message: "Your order has been cancelled. Any applicable refund will be processed shortly.",
      color: "#dc2626",
    },
  };

  const current = statusConfig[status];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:30px 10px;">

      <!-- MAIN CARD -->
      <table width="600" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.05);">

        <!-- HEADER -->
        <tr>
          <td align="center" style="padding:24px;">
            <img src="${logoUrl}" alt="Itara Home" style="height:46px;"/>
          </td>
        </tr>

        <!-- STATUS TITLE -->
        <tr>
          <td align="center" style="padding:10px 24px;">
            <h2 style="margin:0;color:${current.color};">
              ${current.title}
            </h2>
          </td>
        </tr>

        <!-- MESSAGE -->
        <tr>
          <td style="padding:20px 24px;color:#374151;font-size:15px;">
            <p style="margin:0 0 10px;">
              Hi <strong>${customerName}</strong>,
            </p>
            <p style="margin:0 0 10px;">
              ${current.message}
            </p>
            <p style="margin:0;">
              <strong>Order ID:</strong> ${orderNumber}
            </p>
          </td>
        </tr>

        <!-- PRODUCT LIST -->
        <tr>
          <td style="padding:0 24px;">
            <h3 style="margin:20px 0 10px;color:#111827;">Items in this order</h3>

            <table width="100%" cellpadding="10" cellspacing="0"
              style="border-collapse:collapse;background:#f9fafb;border-radius:8px;">
      ${items.map(item => {
  const imageUrl = item.productId?.mainImage
    ? `${backend_url.replace(/\/$/, '')}/${item.productId.mainImage.replace(/^\//, '')}`
    : 'https://via.placeholder.com/60'

  return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td width="60">
        <img 
          src="${imageUrl}"
          width="60"
          height="60"
          alt="${item.productId?.name || 'Product image'}"
          style="border-radius:6px;object-fit:cover;display:block;"
        />
      </td>
      <td style="color:#374151;">
        <div style="font-weight:600;">${item.productId?.name}</div>
        <div style="font-size:13px;color:#6b7280;">
          Qty: ${item.quantity}
        </div>
      </td>
      <td align="right" style="font-weight:600;color:#111827;">
        ₹${item.price}
      </td>
    </tr>
  `
}).join("")}

            </table>
          </td>
        </tr>

        <!-- TOTAL -->
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%">
              <tr>
                <td style="font-size:16px;font-weight:600;">Total</td>
                <td align="right" style="font-size:16px;font-weight:600;">
                  ₹${total}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:10px 24px 30px;">
            <a href="${orderUrl}"
              style="
                background:#111827;
                color:#ffffff;
                padding:14px 30px;
                border-radius:8px;
                text-decoration:none;
                font-weight:600;
                display:inline-block;
              ">
              View Order
            </a>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center"
            style="padding:20px;background:#f9fafb;color:#6b7280;font-size:13px;">
            © ${new Date().getFullYear()} Itara Home. All rights reserved.
          </td>
        </tr>

      </table>
      <!-- END CARD -->

    </td>
  </tr>
</table>

</body>
</html>
`;
};
