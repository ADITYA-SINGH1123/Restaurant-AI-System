import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";

const trackingSteps = [
  "Order Placed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
];

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(
          "http://localhost:5000/api/orders/my-orders",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch order.");
        }

        const foundOrder = (data.orders || []).find(
          (item) => item._id === orderId,
        );

        if (!foundOrder) {
          throw new Error("Order not found.");
        }

        if (!ignore) {
          setOrder(foundOrder);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        console.error("Order details error:", err);

        if (!ignore) {
          setError(err.message || "Unable to load order details.");
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      ignore = true;
    };
  }, [orderId, navigate]);

  const getStepState = (status, step) => {
    if (status === "Cancelled") {
      return "cancelled";
    }

    const currentIndex = trackingSteps.indexOf(status);
    const stepIndex = trackingSteps.indexOf(step);

    if (stepIndex < currentIndex) {
      return "completed";
    }

    if (stepIndex === currentIndex) {
      return "current";
    }

    return "pending";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${Number(amount || 0).toFixed(2)}`;
  };

  const downloadInvoice = () => {
    if (!order) return;

    try {
      setInvoiceLoading(true);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const margin = 18;

      // =========================
      // CUSTOMER DETAILS
      // =========================

      const customerName =
        order.customerName || order.name || order.customer?.name || "Customer";

      const phone =
        order.phone || order.customerPhone || order.customer?.phone || "N/A";

      const address = order.address || "Address not available";

      // =========================
      // ITEM CALCULATIONS
      // =========================

      const items = order.items || [];

      const itemSubtotal = items.reduce((total, item) => {
        const price = Number(item.price || 0);
        const quantity = Number(item.quantity || 1);

        return total + price * quantity;
      }, 0);

      const totalAmount = Number(order.totalAmount || 0);

      const additionalAmount = Math.max(0, totalAmount - itemSubtotal);

      // =========================
      // HEADER
      // =========================

      doc.setFillColor(255, 247, 237);
      doc.rect(0, 0, pageWidth, 48, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(230, 126, 34);
      doc.text("RK RESTAURANT", margin, 21);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text("Food Delivery & Restaurant Service", margin, 29);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.setTextColor(40, 40, 40);
      doc.text("INVOICE", pageWidth - margin, 20, {
        align: "right",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);

      doc.text(`Invoice: ${order._id}`, pageWidth - margin, 28, {
        align: "right",
      });

      doc.text(`Date: ${formatDate(order.createdAt)}`, pageWidth - margin, 35, {
        align: "right",
      });

      // =========================
      // CUSTOMER / ORDER INFO
      // =========================

      let y = 62;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Customer Information", margin, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);

      y += 9;

      doc.text(`Name: ${customerName}`, margin, y);
      y += 6;

      doc.text(`Phone: ${phone}`, margin, y);

      // Right-side order information
      let rightY = 62;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Order Information", pageWidth / 2 + 5, rightY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);

      rightY += 9;

      doc.text(
        `Status: ${order.status || "Order Placed"}`,
        pageWidth / 2 + 5,
        rightY,
      );

      rightY += 6;

      doc.text(
        `Payment: ${order.paymentMethod || "Razorpay"}`,
        pageWidth / 2 + 5,
        rightY,
      );

      // =========================
      // DELIVERY ADDRESS
      // =========================

      y = 88;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Delivery Address", margin, y);

      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);

      const addressLines = doc.splitTextToSize(address, pageWidth - margin * 2);

      doc.text(addressLines, margin, y);

      y += Math.max(12, addressLines.length * 5 + 6);

      // =========================
      // ITEMS TABLE
      // =========================

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(40, 40, 40);
      doc.text("Ordered Items", margin, y);

      y += 8;

      const tableLeft = margin;
      const tableRight = pageWidth - margin;
      const tableWidth = tableRight - tableLeft;

      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(tableLeft, y, tableWidth, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);

      doc.text("ITEM", tableLeft + 4, y + 6.5);
      doc.text("PRICE", tableLeft + 100, y + 6.5);
      doc.text("QTY", tableLeft + 132, y + 6.5);
      doc.text("AMOUNT", tableRight - 4, y + 6.5, {
        align: "right",
      });

      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      items.forEach((item) => {
        const itemName = item.name || "Food Item";
        const price = Number(item.price || 0);
        const quantity = Number(item.quantity || 1);
        const amount = price * quantity;

        const itemLines = doc.splitTextToSize(itemName, 88);

        const rowHeight = Math.max(9, itemLines.length * 5 + 4);

        // Page handling
        if (y + rowHeight > pageHeight - 45) {
          doc.addPage();

          y = 20;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(40, 40, 40);

          doc.text("Ordered Items - Continued", margin, y);

          y += 8;

          doc.setFillColor(245, 245, 245);
          doc.rect(tableLeft, y, tableWidth, 10, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);

          doc.text("ITEM", tableLeft + 4, y + 6.5);
          doc.text("PRICE", tableLeft + 100, y + 6.5);
          doc.text("QTY", tableLeft + 132, y + 6.5);

          doc.text("AMOUNT", tableRight - 4, y + 6.5, {
            align: "right",
          });

          y += 10;

          doc.setFont("helvetica", "normal");
        }

        doc.setTextColor(60, 60, 60);

        doc.text(itemLines, tableLeft + 4, y + 6);

        doc.text(formatCurrency(price), tableLeft + 100, y + 6);

        doc.text(String(quantity), tableLeft + 132, y + 6);

        doc.text(formatCurrency(amount), tableRight - 4, y + 6, {
          align: "right",
        });

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);

        doc.line(tableLeft, y + rowHeight, tableRight, y + rowHeight);

        y += rowHeight;
      });

      // =========================
      // BILL SUMMARY
      // =========================

      y += 8;

      if (y + 42 > pageHeight - 35) {
        doc.addPage();
        y = 25;
      }

      const summaryX = pageWidth - 85;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);

      doc.text("Item Subtotal", summaryX, y);

      doc.text(formatCurrency(itemSubtotal), tableRight, y, {
        align: "right",
      });

      y += 7;

      doc.text("Additional Charges", summaryX, y);

      doc.text(formatCurrency(additionalAmount), tableRight, y, {
        align: "right",
      });

      y += 5;

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);

      doc.line(summaryX, y, tableRight, y);

      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(230, 126, 34);

      doc.text("TOTAL", summaryX, y);

      doc.text(formatCurrency(totalAmount), tableRight, y, {
        align: "right",
      });

      // =========================
      // PAYMENT STATUS
      // =========================

      y += 18;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(40, 40, 40);

      doc.text("Payment Status", margin, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);

      y += 7;

      const paymentStatus =
        order.status === "Cancelled" ? "Order Cancelled" : "Payment Received";

      doc.text(
        `${paymentStatus} • ${order.paymentMethod || "Razorpay"}`,
        margin,
        y,
      );

      // =========================
      // FOOTER
      // =========================

      const footerY = pageHeight - 24;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);

      doc.line(margin, footerY - 7, tableRight, footerY - 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(230, 126, 34);

      doc.text(
        "Thank you for ordering from RK Restaurant!",
        pageWidth / 2,
        footerY,
        {
          align: "center",
        },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);

      doc.text(
        "This is a computer-generated invoice and does not require a signature.",
        pageWidth / 2,
        footerY + 6,
        {
          align: "center",
        },
      );

      // =========================
      // SAVE PDF
      // =========================

      const safeOrderId = String(order._id || "order").replace(
        /[^a-zA-Z0-9-_]/g,
        "",
      );

      doc.save(`RK-Restaurant-Invoice-${safeOrderId}.pdf`);
    } catch (err) {
      console.error("Invoice generation error:", err);
      alert("❌ Unable to generate invoice.");
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <p className="text-lg font-semibold text-orange-600">
          Loading order details...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-md w-full">
          <div className="text-5xl mb-4">❌</div>

          <h2 className="text-xl font-bold text-gray-800">Order Not Found</h2>

          <p className="text-red-600 mt-2">
            {error || "Unable to find this order."}
          </p>

          <button
            onClick={() => navigate("/my-orders")}
            className="mt-6 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-semibold"
          >
            ← Back to My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/my-orders")}
          className="mb-6 text-orange-600 hover:text-orange-700 font-semibold"
        >
          ← Back to My Orders
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                📋 Order Details
              </h1>

              <p className="text-gray-500 mt-2 break-all">
                Order ID: {order._id}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Placed on: {formatDate(order.createdAt)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-3">
              <span className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full font-semibold">
                {order.status}
              </span>

              <button
                onClick={downloadInvoice}
                disabled={invoiceLoading}
                className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                  invoiceLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {invoiceLoading ? "Generating..." : "📄 Download Invoice"}
              </button>
            </div>
          </div>
        </div>

        {/* Tracking */}
        {order.status === "Cancelled" ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-red-700">
              ❌ Order Cancelled
            </h2>

            <p className="text-red-600 mt-2">This order has been cancelled.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-8">
              🚚 Order Tracking
            </h2>

            <div className="grid grid-cols-4 gap-2">
              {trackingSteps.map((step, index) => {
                const state = getStepState(order.status, step);

                return (
                  <div
                    key={step}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                        state === "completed"
                          ? "bg-green-500 text-white"
                          : state === "current"
                            ? "bg-orange-500 text-white"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {state === "completed" ? "✓" : index + 1}
                    </div>

                    <p
                      className={`text-xs sm:text-sm mt-3 ${
                        state === "current"
                          ? "font-bold text-orange-600"
                          : state === "completed"
                            ? "font-semibold text-green-600"
                            : "text-gray-500"
                      }`}
                    >
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🍽️ Ordered Items
          </h2>

          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-gray-50 rounded-lg p-4"
              >
                <div>
                  <p className="font-semibold text-gray-800">{item.name}</p>

                  <p className="text-sm text-gray-500">
                    ₹{item.price} × {item.quantity}
                  </p>
                </div>

                <p className="font-bold text-gray-800">
                  ₹{item.price * item.quantity}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Address */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              💳 Payment Information
            </h2>

            <p className="text-gray-500 text-sm">Payment Method</p>

            <p className="font-semibold text-gray-800 mt-1">
              {order.paymentMethod || "Razorpay"}
            </p>

            <p className="text-gray-500 text-sm mt-4">Total Amount</p>

            <p className="text-2xl font-bold text-orange-600 mt-1">
              ₹{order.totalAmount}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📍 Delivery Address
            </h2>

            <p className="text-gray-700">
              {order.address || "Address not available"}
            </p>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5">
            🕐 Order History
          </h2>

          {order.statusHistory?.length > 0 ? (
            <div className="space-y-4">
              {order.statusHistory.map((history, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-800">
                      {history.status}
                    </p>

                    <p className="text-sm text-gray-500">
                      {formatDate(history.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No order history available.</p>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => navigate("/my-orders")}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            ← Back to My Orders
          </button>

          <button
            onClick={downloadInvoice}
            disabled={invoiceLoading}
            className={`px-6 py-3 rounded-lg font-semibold text-white ${
              invoiceLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {invoiceLoading
              ? "Generating Invoice..."
              : "📄 Download Invoice PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
