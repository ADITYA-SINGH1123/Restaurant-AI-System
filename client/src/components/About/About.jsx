// ======================================================
// ABOUT COMPONENT
// ======================================================
// RK Restaurant ka premium About section.
//
// Includes:
// 1. Restaurant introduction
// 2. Restaurant features
// 3. Restaurant promise
// 4. Founder / Manager / Admin profiles
// 5. Contact information
// 6. Restaurant location
//
// Production Goals:
// - Premium modern restaurant design
// - Fully responsive
// - Accessible semantic structure
// - Keyboard-friendly interactions
// - Reduced-motion support
// - Balanced vertical spacing
// - Proper image aspect ratio
// - Premium team cards
// - Smooth hover animations
// ======================================================

function About () {
  // ======================================================
  // TEAM MEMBERS
  // ======================================================
  // Stable IDs are used instead of role/name as React keys.
  // This makes the list safer if role or name changes later.
  // ======================================================

  const teamMembers = [
    {
      id: 'founder',
      image: '/images/founder.jpg',
      alt: 'Founder of RK Restaurant',
      badge: '👨‍💼 Founder',
      role: 'Founder & Visionary',
      name: 'Aditya Singh',
      description:
        'Building a smarter way to discover food and creating better digital experiences for every customer.'
    },
    {
      id: 'manager',
      image: '/images/manager.jpg',
      alt: 'Manager of RK Restaurant',
      badge: '👨‍💼 Manager',
      role: 'Restaurant Manager',
      name: 'Priyanshu Sharma',
      description:
        'Helping manage daily restaurant operations and creating a smooth experience for every customer.'
    },
    {
      id: 'admin',
      image: '/images/admin.jpg',
      alt: 'Admin of RK Restaurant',
      badge: '🛡️ Admin',
      role: 'System Administrator',
      name: 'Anurag Singh',
      description:
        'Managing the restaurant platform and supporting smooth digital operations.'
    }
  ]

  // ======================================================
  // RESTAURANT FEATURES
  // ======================================================

  const features = [
    {
      icon: '🍽️',
      title: 'Quality Food',
      description: 'Delicious meals prepared with care and quality.'
    },
    {
      icon: '🤖',
      title: 'AI Recommendations',
      description: 'Smart suggestions to help you discover new dishes.'
    },
    {
      icon: '🛒',
      title: 'Easy Ordering',
      description: 'Simple online ordering designed for convenience.'
    },
    {
      icon: '❤️',
      title: 'Customer First',
      description: 'Your satisfaction and experience are our priority.'
    }
  ]

  return (
    <section
      id='about'
      aria-labelledby='about-title'
      className='relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(249,115,22,0.12),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(251,146,60,0.10),_transparent_30%),linear-gradient(to_bottom,_#ffffff,_#fffaf5,_#ffffff)] py-16 sm:py-20 lg:py-24'
    >
      {/* ==================================================
          DECORATIVE BACKGROUND
          aria-hidden prevents screen readers from treating
          visual decoration as meaningful content.
      ================================================== */}

      <div
        aria-hidden='true'
        className='pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-orange-300/20 blur-3xl'
      />

      <div
        aria-hidden='true'
        className='pointer-events-none absolute -right-40 bottom-10 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl'
      />

      <div
        aria-hidden='true'
        className='pointer-events-none absolute left-1/2 top-[45%] h-72 w-72 -translate-x-1/2 rounded-full bg-orange-200/10 blur-3xl'
      />

      {/* ==================================================
          MAIN CONTAINER
      ================================================== */}

      <div className='relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8'>
        {/* ==================================================
            SECTION HEADER
        ================================================== */}

        <div className='mx-auto max-w-3xl text-center'>
          <p className='text-xs font-extrabold uppercase tracking-[0.35em] text-orange-600 sm:text-sm'>
            Discover Our Story
          </p>

          <h2
            id='about-title'
            className='mt-3 text-4xl font-black tracking-[-0.04em] text-gray-950 sm:text-5xl lg:text-6xl'
          >
            About
            <span className='text-orange-600'> RK Restaurant</span>
          </h2>

          <div
            aria-hidden='true'
            className='mx-auto mt-5 flex items-center justify-center gap-2'
          >
            <span className='h-px w-10 bg-orange-200 sm:w-14' />

            <span className='h-1.5 w-16 rounded-full bg-orange-600 sm:w-20' />

            <span className='h-px w-10 bg-orange-200 sm:w-14' />
          </div>

          <p className='mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base sm:leading-8 lg:text-lg'>
            Where delicious food, smart technology, and memorable dining
            experiences come together.
          </p>
        </div>

        {/* ==================================================
            STORY SECTION
        ================================================== */}

        <div className='mt-12 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1fr_0.9fr] lg:gap-14'>
          {/* ==================================================
              LEFT - RESTAURANT STORY
          ================================================== */}

          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2'>
              <span
                aria-hidden='true'
                className='h-2 w-2 rounded-full bg-orange-600'
              />

              <span className='text-xs font-bold uppercase tracking-[0.22em] text-orange-700'>
                Our Story
              </span>
            </div>

            <h3 className='mt-4 max-w-2xl text-3xl font-black leading-tight tracking-[-0.03em] text-gray-950 sm:text-4xl lg:text-[2.6rem]'>
              Delicious Food Meets
              <span className='text-orange-600'> Smart Technology</span>
            </h3>

            <p className='mt-5 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base sm:leading-8'>
              RK Restaurant is a modern food destination created to make the way
              people discover and order food easier, smarter, and more
              enjoyable.
            </p>

            <p className='mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base sm:leading-8'>
              From delicious meals to AI-powered recommendations, our platform
              combines great food with modern technology. Customers can explore
              the menu, discover new dishes, place orders easily, and enjoy a
              smooth digital dining experience.
            </p>

            <p className='mt-3 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base sm:leading-8'>
              Our vision is simple — bring together{' '}
              <span className='font-bold text-gray-900'>
                quality food, smart choices, easy ordering,
              </span>{' '}
              and excellent customer service in one place.
            </p>

            {/* ==================================================
                FEATURE GRID
            ================================================== */}

            <div className='mt-7 grid gap-3.5 sm:grid-cols-2'>
              {features.map(feature => (
                <div
                  key={feature.title}
                  className='group rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-[0_8px_25px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_15px_35px_rgba(249,115,22,0.11)] motion-reduce:transform-none motion-reduce:transition-none'
                >
                  <div className='flex items-start gap-3'>
                    <div
                      aria-hidden='true'
                      className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-lg ring-1 ring-orange-100 transition duration-300 group-hover:scale-105 group-hover:bg-orange-100 motion-reduce:transform-none motion-reduce:transition-none'
                    >
                      {feature.icon}
                    </div>

                    <div>
                      <h4 className='text-sm font-extrabold text-gray-900 sm:text-base'>
                        {feature.title}
                      </h4>

                      <p className='mt-1 text-xs leading-5 text-gray-600 sm:text-sm'>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ==================================================
              RIGHT - PREMIUM HIGHLIGHT CARD
          ================================================== */}

          <div className='relative'>
            <div
              aria-hidden='true'
              className='absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-orange-200/40 via-transparent to-amber-200/30 blur-2xl'
            />

            <div className='relative overflow-hidden rounded-[2rem] border border-orange-100 bg-white/80 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-md'>
              <div className='rounded-[1.6rem] bg-gray-950 p-6 sm:p-7'>
                {/* ==================================================
                    PROMISE HEADING
                ================================================== */}

                <div className='flex items-center gap-3'>
                  <div
                    aria-hidden='true'
                    className='flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-lg shadow-lg shadow-orange-600/20'
                  >
                    ✨
                  </div>

                  <div>
                    <p className='text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs'>
                      Our Promise
                    </p>

                    <h4 className='mt-1 text-lg font-black text-white sm:text-xl'>
                      A Better Dining Experience
                    </h4>
                  </div>
                </div>

                {/* ==================================================
                    PROMISE ITEMS
                ================================================== */}

                <div className='mt-5 space-y-3'>
                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-3.5'>
                    <div className='flex items-center gap-3'>
                      <span aria-hidden='true' className='text-lg'>
                        🍴
                      </span>

                      <div>
                        <p className='text-sm font-bold text-white'>
                          Delicious & Reliable
                        </p>

                        <p className='mt-0.5 text-xs leading-5 text-gray-400'>
                          Quality-focused meals and a smooth ordering journey.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-3.5'>
                    <div className='flex items-center gap-3'>
                      <span aria-hidden='true' className='text-lg'>
                        🧠
                      </span>

                      <div>
                        <p className='text-sm font-bold text-white'>
                          Powered by Smart Technology
                        </p>

                        <p className='mt-0.5 text-xs leading-5 text-gray-400'>
                          AI features designed to make food discovery easier.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='rounded-2xl border border-white/10 bg-white/[0.06] p-3.5'>
                    <div className='flex items-center gap-3'>
                      <span aria-hidden='true' className='text-lg'>
                        ❤️
                      </span>

                      <div>
                        <p className='text-sm font-bold text-white'>
                          Customer Focused
                        </p>

                        <p className='mt-0.5 text-xs leading-5 text-gray-400'>
                          Every interaction is designed around convenience.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ==================================================
                    QUOTE
                ================================================== */}

                <div className='mt-5 border-t border-white/10 pt-5'>
                  <p className='text-xs italic leading-6 text-gray-400 sm:text-sm sm:leading-7'>
                    “Great food brings people together, and smart technology
                    makes the experience even better.”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            TEAM SECTION
        ================================================== */}

        <div className='mt-16 sm:mt-20'>
          {/* ==================================================
              TEAM HEADING
          ================================================== */}

          <div className='mx-auto max-w-2xl text-center'>
            <p className='text-xs font-extrabold uppercase tracking-[0.3em] text-orange-600 sm:text-sm'>
              Meet The Team
            </p>

            <h3 className='mt-2.5 text-3xl font-black tracking-[-0.03em] text-gray-950 sm:text-4xl lg:text-5xl'>
              The People Behind
              <span className='text-orange-600'> RK Restaurant</span>
            </h3>

            <p className='mt-3 text-sm leading-6 text-gray-600 sm:text-base sm:leading-7'>
              A dedicated team working together to build a smarter and better
              restaurant experience.
            </p>
          </div>

          {/* ==================================================
              TEAM CARDS
          ================================================== */}

          <div className='mx-auto mt-9 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {teamMembers.map(member => (
              <article
                key={member.id}
                className='group relative overflow-hidden rounded-[1.8rem] border border-gray-200/80 bg-gray-950 shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition-all duration-500 ease-out hover:-translate-y-2 hover:border-orange-200 hover:shadow-[0_28px_65px_rgba(15,23,42,0.20)] motion-reduce:transform-none motion-reduce:transition-none'
              >
                {/* ==================================================
                    PREMIUM TOP GLOW
                ================================================== */}

                <div
                  aria-hidden='true'
                  className='pointer-events-none absolute inset-x-10 top-0 z-20 h-px bg-gradient-to-r from-transparent via-orange-400/80 to-transparent'
                />

                {/* ==================================================
                    IMAGE
                    4:5 ratio keeps all photos consistent.
                ================================================== */}

                <div className='relative aspect-[4/5] w-full overflow-hidden'>
                  <img
                    src={member.image}
                    alt={member.alt}
                    loading='lazy'
                    decoding='async'
                    className='h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none'
                  />

                  {/* Dark image gradient */}

                  <div
                    aria-hidden='true'
                    className='absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/10 to-transparent'
                  />

                  {/* Soft orange glow */}

                  <div
                    aria-hidden='true'
                    className='pointer-events-none absolute -bottom-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-orange-500/20 blur-3xl transition duration-500 group-hover:bg-orange-500/30 motion-reduce:transition-none'
                  />

                  {/* ==================================================
                      BADGE
                  ================================================== */}

                  <div className='absolute left-4 top-4'>
                    <div className='flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-bold tracking-wide text-white shadow-lg backdrop-blur-xl transition duration-300 group-hover:border-orange-300/30 group-hover:bg-black/55 motion-reduce:transition-none sm:text-[11px]'>
                      <span aria-hidden='true'>{member.badge}</span>
                    </div>
                  </div>

                  {/* ==================================================
                      NAME + ROLE
                  ================================================== */}

                  <div className='absolute bottom-0 left-0 right-0 p-5 sm:p-6'>
                    <p className='text-[9px] font-extrabold uppercase tracking-[0.22em] text-orange-400 sm:text-[10px]'>
                      {member.role}
                    </p>

                    <h4 className='mt-1 text-2xl font-black tracking-[-0.02em] text-white sm:text-[1.65rem]'>
                      {member.name}
                    </h4>
                  </div>
                </div>

                {/* ==================================================
                    DESCRIPTION
                ================================================== */}

                <div className='relative border-t border-white/10 bg-gradient-to-b from-gray-950 to-gray-900 px-5 pb-5 pt-4 sm:px-6'>
                  <p className='text-xs leading-6 text-gray-400 sm:text-sm'>
                    {member.description}
                  </p>

                  {/* Bottom accent */}

                  <div
                    aria-hidden='true'
                    className='mt-4 flex items-center gap-2'
                  >
                    <span className='h-1 w-8 rounded-full bg-orange-600 transition-all duration-300 group-hover:w-12 motion-reduce:transition-none' />

                    <span className='h-1 w-2 rounded-full bg-orange-300/50' />

                    <span className='h-1 w-2 rounded-full bg-orange-300/30' />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ==================================================
            CONTACT SECTION
        ================================================== */}

        <div className='relative mt-16 overflow-hidden rounded-[2rem] border border-gray-800 bg-gray-950 shadow-[0_22px_60px_rgba(15,23,42,0.18)] sm:mt-20'>
          {/* Decorative glow */}

          <div
            aria-hidden='true'
            className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-600/20 blur-3xl'
          />

          <div
            aria-hidden='true'
            className='pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl'
          />

          <div className='relative p-6 sm:p-8 md:p-10'>
            {/* ==================================================
                CONTACT HEADING
            ================================================== */}

            <div className='max-w-2xl'>
              <p className='text-xs font-bold uppercase tracking-[0.25em] text-orange-400 sm:text-sm'>
                Need Assistance?
              </p>

              <h3 className='mt-2 text-3xl font-black text-white sm:text-4xl'>
                Contact Us
              </h3>

              <p className='mt-3 max-w-xl text-sm leading-7 text-gray-400 sm:text-base'>
                Facing an issue with your order or need help? Get in touch with
                RK Restaurant.
              </p>
            </div>

            {/* ==================================================
                CONTACT CARDS
            ================================================== */}

            <div className='mt-7 grid gap-5 md:grid-cols-2'>
              {/* ==================================================
                  PHONE
              ================================================== */}

              <div className='group rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/30 hover:bg-white/[0.08] motion-reduce:transform-none motion-reduce:transition-none sm:p-6'>
                <div className='flex items-start gap-4'>
                  <div
                    aria-hidden='true'
                    className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-lg shadow-lg shadow-orange-600/20'
                  >
                    📞
                  </div>

                  <div>
                    <p className='text-xs font-bold uppercase tracking-widest text-gray-500'>
                      Call Us
                    </p>

                    <a
                      href='tel:+917825xxxxx'
                      aria-label='Call RK  Restaurant customer support'
                      className='mt-1.5 block rounded-md text-lg font-extrabold text-white transition hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none sm:text-xl'
                    >
                      +91 7825xxxxx
                    </a>

                    <p className='mt-1 text-sm text-gray-500'>
                      Customer support
                    </p>
                  </div>
                </div>
              </div>

              {/* ==================================================
                  LOCATION
              ================================================== */}

              <div className='group rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/30 hover:bg-white/[0.08] motion-reduce:transform-none motion-reduce:transition-none sm:p-6'>
                <div className='flex items-start gap-4'>
                  <div
                    aria-hidden='true'
                    className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-lg shadow-lg shadow-orange-600/20'
                  >
                    📍
                  </div>

                  <div>
                    <p className='text-xs font-bold uppercase tracking-widest text-gray-500'>
                      Location
                    </p>

                    <p className='mt-1.5 text-lg font-extrabold text-white sm:text-xl'>
                      Noida
                    </p>

                    <p className='mt-1 text-sm text-gray-500'>
                      Uttar Pradesh, India
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            BOTTOM TAGLINE
        ================================================== */}

        <div className='mt-9 text-center sm:mt-10'>
          <p className='text-base font-bold text-gray-900 sm:text-lg'>
            Fresh Food
            <span aria-hidden='true' className='mx-2 text-orange-500'>
              •
            </span>
            Smart Choices
            <span aria-hidden='true' className='mx-2 text-orange-500'>
              •
            </span>
            Easy Ordering
          </p>

          <p className='mt-1.5 text-xs text-gray-500 sm:text-sm'>
            RK Restaurant — making every meal a little smarter. ❤️
          </p>
        </div>
      </div>
    </section>
  )
}

// ======================================================
// EXPORT COMPONENT
// ======================================================

export default About
