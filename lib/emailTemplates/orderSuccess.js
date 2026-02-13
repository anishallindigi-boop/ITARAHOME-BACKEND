module.exports = function orderSuccessTemplate({
  customerName,
  orderNumber,
  items,
  subtotal,
  shippingCost,
  tax,
  total,
}) {
  const orderUrl = `https://itarahome.com/dashboard/orders/${orderNumber}`;
  const logoUrl = `https://itarahome.com/logo.png`;
const backend_url=process.env.BACKEND_URL
console.log(items,"items")

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Order Confirmed</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:30px 10px;">
          
          <!-- MAIN CONTAINER -->
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;">
            
            <!-- HEADER -->
            <tr>
              <td align="center" style="padding:24px;background:#ffffff;">
                <img src="${logoUrl}" alt="Itara Home" style="height:48px;display:block;" />
              </td>
            </tr>

            <!-- SUCCESS MESSAGE -->
            <tr>
              <td align="center" style="padding:10px 24px 0;">
                <h2 style="color:#16a34a;margin:0;">🎉 Order Placed Successfully</h2>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 24px;color:#374151;">
                <p style="margin:0 0 10px;">Hi <strong>${customerName}</strong>,</p>
                <p style="margin:0;">
                  Thank you for shopping with us! Your order
                  <strong>${orderNumber}</strong> has been successfully placed.
                </p>
              </td>
            </tr>

            <!-- ORDER SUMMARY -->
            <tr>
              <td style="padding:0 24px;">
                <h3 style="margin:20px 0 10px;color:#111827;">Order Summary</h3>
                <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
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

            <!-- TOTALS -->
            <tr>
              <td style="padding:16px 24px;">
                <table width="100%" cellpadding="6">
                  <tr>
                    <td>Subtotal</td>
                    <td align="right">₹${subtotal}</td>
                  </tr>
                  <tr>
                    <td>Shipping</td>
                    <td align="right">₹${shippingCost}</td>
                  </tr>
                  <tr>
                    <td>Tax</td>
                    <td align="right">₹${tax}</td>
                  </tr>
                  <tr>
                    <td style="font-weight:bold;font-size:16px;">Total</td>
                    <td align="right" style="font-weight:bold;font-size:16px;">
                      ₹${total}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CTA BUTTON -->
            <tr>
              <td align="center" style="padding:20px 24px;">
                <a href="${orderUrl}"
                  style="
                    background:#111827;
                    color:#ffffff;
                    text-decoration:none;
                    padding:14px 28px;
                    border-radius:6px;
                    display:inline-block;
                    font-weight:bold;
                    font-size:14px;
                  ">
                  View Order
                </a>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding:20px 24px;color:#6b7280;font-size:13px;text-align:center;">
                <p style="margin:0;">
                  We’ll notify you once your order is shipped 🚚
                </p>
                <p style="margin:8px 0 0;">
                  © ${new Date().getFullYear()} Itara Home. All rights reserved.
                </p>
              </td>
            </tr>

          </table>
          <!-- END CONTAINER -->

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};
