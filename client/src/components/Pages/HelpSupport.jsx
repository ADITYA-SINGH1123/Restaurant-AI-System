// ======================================================
// HELP & SUPPORT PAGE
// ======================================================
// Customer ke liye Help & Support page.
//
// Features:
// 1. FAQ accordion
// 2. Quick Help cards
// 3. Contact Support
// 4. Real customer-admin Live Chat
// 5. Chat history from backend
// 6. Send customer message
// 7. Real-time admin reply using Socket.io
// 8. Responsive design
// ======================================================

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// ======================================================
// HELP & SUPPORT COMPONENT
// ======================================================

const HelpSupport = () => {
  // ====================================================
  // FAQ STATE
  // ====================================================

  const [openFaq, setOpenFaq] = useState(null);

  // ====================================================
  // SUPPORT MESSAGE
  // ====================================================

  const [supportMessage, setSupportMessage] = useState("");

  // ====================================================
  // CHAT STATE
  // ====================================================

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState("");

  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  // ====================================================
  // GET AUTH TOKEN
  // ====================================================

  const getAuthToken = () => {
    return localStorage.getItem("token") || "";
  };

  // ====================================================
  // GET LOGGED-IN USER
  // ====================================================

  const getLoggedInUser = () => {
    try {
      return JSON.parse(localStorage.getItem("loggedInUser")) || null;
    } catch (error) {
      console.error("HelpSupport user data error:", error);
      return null;
    }
  };

  // ====================================================
  // FAQ DATA
  // ====================================================

  const faqs = [
    {
      question: "How can I place an order?",
      answer:
        "Menu page par jaakar food item select karein, Cart me add karein, Checkout par jaakar delivery details fill karein aur payment complete karein.",
    },
    {
      question: "How can I track my order?",
      answer:
        "My Orders page par jaakar aap apne order ka current status dekh sakte hain, jaise Order Placed, Preparing, Out for Delivery aur Delivered.",
    },
    {
      question: "Can I cancel my order?",
      answer:
        "Order Delivered hone se pehle cancellation option available ho sakta hai. Cancelled order ko dobara status update nahi kiya ja sakta.",
    },
    {
      question: "How does loyalty points work?",
      answer:
        "Successful delivered orders par loyalty points earn hote hain. Available points ko future orders me discount ke liye use kiya ja sakta hai.",
    },
    {
      question: "How can I reserve a table?",
      answer:
        "Reserve Table page par jaakar date, time, guests aur table preference select karke reservation submit karein.",
    },
    {
      question: "Where can I see my reservations?",
      answer:
        "My Reservations page par aap apni current aur previous table reservations dekh sakte hain.",
    },
    {
      question: "How can I update my profile?",
      answer:
        "Profile page par jaakar Edit Profile option se apna name aur phone number update kar sakte hain.",
    },
    {
      question: "What should I do if payment fails?",
      answer:
        "Agar payment fail ho jaye to order complete nahi hoga. Cart se dobara checkout karke payment try kar sakte hain.",
    },
  ];

  // ====================================================
  // FAQ TOGGLE
  // ====================================================

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // ====================================================
  // FETCH CUSTOMER CHAT
  // ====================================================

  const fetchChatMessages = async () => {
    const token = getAuthToken();
    const user = getLoggedInUser();

    // Chat sirf logged-in customer ke liye.
    if (!token || !user || user.role === "admin") {
      setChatMessages([]);
      return;
    }

    setChatLoading(true);
    setChatError("");

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load chat messages.");
      }

      const messages = Array.isArray(data.messages) ? data.messages : [];

      setChatMessages(messages);
    } catch (error) {
      console.error("Fetch chat messages error:", error);

      setChatError(error.message || "Cannot connect to chat server.");
    } finally {
      setChatLoading(false);
    }
  };

  // ====================================================
  // OPEN CHAT
  // ====================================================

  const openLiveChat = async () => {
    setIsChatOpen(true);
    setSupportMessage("");

    await fetchChatMessages();
  };

  // ====================================================
  // SOCKET.IO CUSTOMER CHAT
  // ====================================================
  // Customer ke liye private user room join karta hai.
  // Admin ka new reply "newChatMessage" event se receive hoga.

  useEffect(() => {
    const token = getAuthToken();
    const user = getLoggedInUser();

    if (!token || !user || user.role === "admin") {
      return undefined;
    }

    const userId = user._id || user.id;

    if (!userId) {
      return undefined;
    }

    const socket = io("http://localhost:5000", {
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("💬 Chat socket connected");

      // Existing backend user room.
      socket.emit("joinUserRoom", String(userId));
    });

    socket.on("newChatMessage", (message) => {
      if (!message || !message._id) {
        return;
      }

      setChatMessages((previousMessages) => {
        // Duplicate message prevent.
        const alreadyExists = previousMessages.some(
          (item) => item._id === message._id,
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [...previousMessages, message];
      });
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Chat socket error:", error.message);
    });

    return () => {
      socket.off("connect");
      socket.off("newChatMessage");
      socket.off("connect_error");

      socket.disconnect();

      socketRef.current = null;
    };
  }, []);

  // ====================================================
  // AUTO SCROLL CHAT
  // ====================================================

  useEffect(() => {
    if (!isChatOpen) {
      return;
    }

    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chatMessages, isChatOpen]);

  // ====================================================
  // SEND CUSTOMER MESSAGE
  // ====================================================

  const sendChatMessage = async (event) => {
    event.preventDefault();

    const message = chatInput.trim();

    if (!message) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setChatError("Please login again to use Live Chat.");
      return;
    }

    if (message.length > 2000) {
      setChatError("Message cannot exceed 2000 characters.");
      return;
    }

    setChatSending(true);
    setChatError("");

    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send message.");
      }

      if (data.chatMessage) {
        setChatMessages((previousMessages) => {
          const alreadyExists = previousMessages.some(
            (item) => item._id === data.chatMessage._id,
          );

          if (alreadyExists) {
            return previousMessages;
          }

          return [...previousMessages, data.chatMessage];
        });
      }

      setChatInput("");
    } catch (error) {
      console.error("Send chat message error:", error);

      setChatError(error.message || "Failed to send message.");
    } finally {
      setChatSending(false);
    }
  };

  // ====================================================
  // MARK ADMIN MESSAGES AS READ
  // ====================================================

  useEffect(() => {
    if (!isChatOpen) {
      return;
    }

    const token = getAuthToken();
    const user = getLoggedInUser();

    if (!token || !user) {
      return;
    }

    const userId = user._id || user.id;

    if (!userId) {
      return;
    }

    fetch(`http://localhost:5000/api/chat/read/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).catch((error) => {
      console.error("Mark chat read error:", error);
    });
  }, [isChatOpen, chatMessages.length]);

  // ====================================================
  // CLOSE CHAT
  // ====================================================

  const closeLiveChat = () => {
    setIsChatOpen(false);
    setChatError("");
  };

  // ====================================================
  // SUPPORT OPTION HANDLER
  // ====================================================

  const handleSupportOption = (type) => {
    if (type === "email") {
      setSupportMessage(
        "📧 Email Support selected. Official support contact details can be connected here in the future.",
      );
    }

    if (type === "ticket") {
      setSupportMessage(
        "🎫 Support Ticket selected. Ticket submission system can be connected here in the future.",
      );
    }

    if (type === "chat") {
      openLiveChat();
    }
  };

  // ====================================================
  // FORMAT CHAT TIME
  // ====================================================

  const formatChatTime = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ====================================================
  // CHECK CURRENT USER MESSAGE
  // ====================================================

  const isMyMessage = (message) => {
    const user = getLoggedInUser();

    if (!user || !message) {
      return false;
    }

    const currentUserId = String(user._id || user.id || "");
    const senderId =
      typeof message.senderId === "object"
        ? String(message.senderId?._id || "")
        : String(message.senderId || "");

    return currentUserId === senderId;
  };

  // ====================================================
  // PAGE UI
  // ====================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "30px 20px 60px",
      }}
    >
      {/* ==================================================
          PAGE HEADER
          ================================================== */}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 30px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "10px",
          }}
        >
          🆘
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "32px",
            color: "#111827",
          }}
        >
          Help & Support
        </h1>

        <p
          style={{
            marginTop: "10px",
            color: "#6b7280",
            fontSize: "16px",
          }}
        >
          Need help? Find answers to common questions below.
        </p>
      </div>

      {/* ==================================================
          QUICK HELP CARDS
          ================================================== */}

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto 35px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        }}
      >
        {/* ORDER HELP */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: "30px" }}>📦</div>

          <h3
            style={{
              margin: "12px 0 8px",
              color: "#111827",
            }}
          >
            Order Help
          </h3>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Order status, cancellation aur order tracking ki help.
          </p>
        </div>

        {/* PAYMENT HELP */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: "30px" }}>💳</div>

          <h3
            style={{
              margin: "12px 0 8px",
              color: "#111827",
            }}
          >
            Payment Help
          </h3>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Payment process aur payment-related common problems.
          </p>
        </div>

        {/* RESERVATION HELP */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: "30px" }}>🍽️</div>

          <h3
            style={{
              margin: "12px 0 8px",
              color: "#111827",
            }}
          >
            Reservation Help
          </h3>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Table reservation aur reservation status se related help.
          </p>
        </div>

        {/* ACCOUNT HELP */}

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            padding: "22px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: "30px" }}>👤</div>

          <h3
            style={{
              margin: "12px 0 8px",
              color: "#111827",
            }}
          >
            Account Help
          </h3>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Profile, password aur account-related assistance.
          </p>
        </div>
      </div>

      {/* ==================================================
          FAQ SECTION
          ================================================== */}

      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "25px",
          boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: "20px",
            color: "#111827",
            textAlign: "center",
          }}
        >
          Frequently Asked Questions
        </h2>

        {faqs.map((faq, index) => (
          <div
            key={index}
            style={{
              borderBottom:
                index === faqs.length - 1 ? "none" : "1px solid #e5e7eb",
            }}
          >
            <button
              type="button"
              onClick={() => toggleFaq(index)}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                padding: "18px 5px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                textAlign: "left",
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              <span>{faq.question}</span>

              <span
                style={{
                  fontSize: "22px",
                  marginLeft: "15px",
                }}
              >
                {openFaq === index ? "−" : "+"}
              </span>
            </button>

            {openFaq === index && (
              <div
                style={{
                  padding: "0 5px 18px",
                  color: "#6b7280",
                  lineHeight: 1.7,
                  fontSize: "15px",
                }}
              >
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ==================================================
          CONTACT SUPPORT
          ================================================== */}

      <div
        style={{
          maxWidth: "900px",
          margin: "30px auto 0",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "25px",
          boxShadow: "0 4px 18px rgba(0,0,0,0.06)",
          border: "1px solid #f3f4f6",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "22px",
          }}
        >
          <div style={{ fontSize: "34px" }}>📞</div>

          <h2
            style={{
              margin: "10px 0 8px",
              color: "#111827",
            }}
          >
            Contact Support
          </h2>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Agar FAQ se problem solve na ho, neeche available support options
            select kar sakte hain.
          </p>
        </div>

        {/* SUPPORT OPTIONS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
          }}
        >
          {/* EMAIL */}

          <button
            type="button"
            onClick={() => handleSupportOption("email")}
            style={{
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "18px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "#fff7ed";
              event.currentTarget.style.borderColor = "#fed7aa";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "#ffffff";
              event.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <div style={{ fontSize: "28px" }}>📧</div>

            <h3
              style={{
                margin: "10px 0 6px",
                color: "#111827",
              }}
            >
              Email Support
            </h3>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Email-based support can be connected in the future.
            </p>
          </button>

          {/* TICKET */}

          <button
            type="button"
            onClick={() => handleSupportOption("ticket")}
            style={{
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "18px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "#fff7ed";
              event.currentTarget.style.borderColor = "#fed7aa";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "#ffffff";
              event.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <div style={{ fontSize: "28px" }}>🎫</div>

            <h3
              style={{
                margin: "10px 0 6px",
                color: "#111827",
              }}
            >
              Support Ticket
            </h3>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Ticket system can be connected in a future backend upgrade.
            </p>
          </button>

          {/* LIVE CHAT */}

          <button
            type="button"
            onClick={() => handleSupportOption("chat")}
            style={{
              border: "1px solid #fed7aa",
              background: "#fff7ed",
              borderRadius: "12px",
              padding: "18px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "#ffedd5";
              event.currentTarget.style.borderColor = "#fdba74";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "#fff7ed";
              event.currentTarget.style.borderColor = "#fed7aa";
            }}
          >
            <div style={{ fontSize: "28px" }}>💬</div>

            <h3
              style={{
                margin: "10px 0 6px",
                color: "#111827",
              }}
            >
              Live Chat
            </h3>

            <p
              style={{
                margin: 0,
                color: "#9a3412",
                fontSize: "14px",
                lineHeight: 1.5,
                fontWeight: "600",
              }}
            >
              Chat directly with RK Restaurant support.
            </p>
          </button>
        </div>

        {/* SUPPORT FEEDBACK */}

        {supportMessage && (
          <div
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontSize: "14px",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {supportMessage}
          </div>
        )}
      </div>

      {/* ==================================================
          SUPPORT INFORMATION
          ================================================== */}

      <div
        style={{
          maxWidth: "900px",
          margin: "30px auto 0",
          background: "#111827",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "25px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "32px" }}>💬</div>

        <h2
          style={{
            margin: "10px 0",
          }}
        >
          Need More Help?
        </h2>

        <p
          style={{
            margin: "0 0 18px",
            color: "#d1d5db",
          }}
        >
          Our support team is available through Live Chat.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#111827",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "600",
            }}
          >
            📧 Email Support
          </div>

          <div
            style={{
              background: "#ffffff",
              color: "#111827",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "600",
            }}
          >
            🎫 Support Ticket
          </div>

          <button
            type="button"
            onClick={openLiveChat}
            style={{
              border: "none",
              background: "#ffffff",
              color: "#111827",
              padding: "10px 16px",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            💬 Live Chat
          </button>
        </div>
      </div>

      {/* ==================================================
          LIVE CHAT MODAL
          ================================================== */}

      {isChatOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          {/* CHAT WINDOW */}

          <div
            style={{
              width: "100%",
              maxWidth: "650px",
              height: "min(720px, 90vh)",
              background: "#ffffff",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* CHAT HEADER */}

            <div
              style={{
                background: "#111827",
                color: "#ffffff",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "19px",
                  }}
                >
                  💬 Live Chat
                </h2>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "#d1d5db",
                    fontSize: "12px",
                  }}
                >
                  RK Restaurant Support
                </p>
              </div>

              <button
                type="button"
                onClick={closeLiveChat}
                style={{
                  width: "38px",
                  height: "38px",
                  border: "none",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.12)",
                  color: "#ffffff",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* CHAT BODY */}

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                background: "#f8fafc",
              }}
            >
              {/* LOADING */}

              {chatLoading && chatMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "50px 20px",
                    color: "#6b7280",
                  }}
                >
                  <div
                    style={{
                      fontSize: "35px",
                      marginBottom: "10px",
                    }}
                  >
                    💬
                  </div>

                  <p style={{ margin: 0 }}>Loading chat...</p>
                </div>
              )}

              {/* ERROR */}

              {!chatLoading && chatError && chatMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                  }}
                >
                  <div style={{ fontSize: "35px" }}>⚠️</div>

                  <p
                    style={{
                      color: "#b91c1c",
                      lineHeight: 1.5,
                    }}
                  >
                    {chatError}
                  </p>

                  <button
                    type="button"
                    onClick={fetchChatMessages}
                    style={{
                      border: "none",
                      borderRadius: "9px",
                      background: "#ea580c",
                      color: "#ffffff",
                      padding: "10px 16px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* EMPTY CHAT */}

              {!chatLoading && !chatError && chatMessages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "50px 20px",
                    color: "#6b7280",
                  }}
                >
                  <div style={{ fontSize: "45px" }}>👋</div>

                  <h3
                    style={{
                      margin: "12px 0 7px",
                      color: "#374151",
                    }}
                  >
                    Start a conversation
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      lineHeight: 1.6,
                      fontSize: "14px",
                    }}
                  >
                    Apni problem ya question yahan type karein. Our support team
                    will reply soon.
                  </p>
                </div>
              )}

              {/* CHAT MESSAGES */}

              {chatMessages.map((message) => {
                const mine = isMyMessage(message);

                return (
                  <div
                    key={message._id}
                    style={{
                      display: "flex",
                      justifyContent: mine ? "flex-end" : "flex-start",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "11px 14px",
                        borderRadius: mine
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                        background: mine ? "#ea580c" : "#ffffff",
                        color: mine ? "#ffffff" : "#374151",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: "800",
                          marginBottom: "4px",
                          opacity: 0.75,
                        }}
                      >
                        {mine
                          ? "You"
                          : message.senderRole === "admin"
                            ? "RK Restaurant Support"
                            : "Support"}
                      </div>

                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          lineHeight: 1.5,
                          fontSize: "14px",
                        }}
                      >
                        {message.message}
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                          fontSize: "9px",
                          opacity: 0.7,
                          textAlign: mine ? "right" : "left",
                        }}
                      >
                        {formatChatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={chatEndRef} />
            </div>

            {/* CHAT ERROR */}

            {chatError && chatMessages.length > 0 && (
              <div
                style={{
                  padding: "9px 15px",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  borderTop: "1px solid #fecaca",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                {chatError}
              </div>
            )}

            {/* CHAT INPUT */}

            <form
              onSubmit={sendChatMessage}
              style={{
                display: "flex",
                gap: "10px",
                padding: "14px",
                borderTop: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={(event) => {
                  setChatInput(event.target.value);
                  setChatError("");
                }}
                placeholder="Type your message..."
                maxLength={2000}
                disabled={chatSending}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  outline: "none",
                  fontSize: "14px",
                }}
              />

              <button
                type="submit"
                disabled={chatSending || !chatInput.trim()}
                style={{
                  border: "none",
                  borderRadius: "12px",
                  padding: "0 18px",
                  background:
                    chatSending || !chatInput.trim() ? "#d1d5db" : "#ea580c",
                  color: "#ffffff",
                  fontWeight: "800",
                  cursor:
                    chatSending || !chatInput.trim()
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {chatSending ? "..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSupport;
