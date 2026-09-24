import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// ======================================================
// MENU COMPONENT
// ======================================================
// Features:
// 1. MongoDB se available food fetch
// 2. Admin-added foods automatically show
// 3. Admin-edited foods automatically show after refresh
// 4. Admin unavailable foods customer menu me nahi dikhenge
// 5. Admin deleted foods customer menu se remove ho jayenge
// 6. Search food
// 7. Category filter
// 8. Search + category filter together
// 9. Food details
// 10. Add food to cart
// 11. Refresh menu
// 12. Professional food cards
// 13. Safe image fallback
// 14. Popular choice badge
// 15. Responsive design
// 16. Combo offers API fetch
// 17. Customer-side combo offers display
// 18. Combo price + original price
// 19. Combo discount percentage
// 20. Combo food items display
// 21. Add combo to cart
// ======================================================

function Menu () {
  const navigate = useNavigate()

  // URL category ke liye
  const [searchParams, setSearchParams] = useSearchParams()

  // ======================================================
  // STATES
  // ======================================================

  const [foods, setFoods] = useState([])

  // ======================================================
  // COMBO OFFERS STATE
  // ======================================================
  // Admin dashboard se available combo offers store honge.
  const [combos, setCombos] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')

  // URL se selected category
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'All'
  )

  // ======================================================
  // CATEGORIES
  // ======================================================

  const categories = [
    'All',
    'Pizza',
    'Burger',
    'Noodles',
    'Dessert',
    'Healthy',
    'Aloo Paratha',
    'Snacks',
    'Drinks'
  ]

  // ======================================================
  // INITIAL FOOD FETCH
  // ======================================================

  useEffect(() => {
    let cancelled = false

    const loadFoods = async () => {
      try {
        setError('')

        const response = await fetch('http://localhost:5000/api/foods')

        if (!response.ok) {
          throw new Error('Failed to fetch foods')
        }

        const data = await response.json()

        if (cancelled) {
          return
        }

        const availableFoods = Array.isArray(data.foods)
          ? data.foods.filter(food => food.available !== false)
          : []

        setFoods(availableFoods)
      } catch (err) {
        if (cancelled) {
          return
        }

        console.error('Food fetch error:', err)

        setError('Food menu load nahi ho paya.')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadFoods()

    return () => {
      cancelled = true
    }
  }, [])

  // ======================================================
  // COMBO OFFERS FETCH
  // ======================================================
  // Admin dashboard se available combo offers fetch honge.
  // Combo API fail hone par normal food menu affected nahi hoga.
  useEffect(() => {
    let cancelled = false

    const loadCombos = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/combos')

        if (!response.ok) {
          throw new Error('Failed to fetch combo offers')
        }

        const data = await response.json()

        if (cancelled) {
          return
        }

        // Current date/time
        const now = new Date()

        // Sirf currently available/valid combos customer ko show honge.
        const availableCombos = Array.isArray(data.combos)
          ? data.combos.filter(combo => {
              // Admin ne unavailable kiya hai to show nahi hoga.
              if (combo.available === false) {
                return false
              }

              // Valid From check.
              if (combo.validFrom) {
                const validFrom = new Date(combo.validFrom)

                if (!Number.isNaN(validFrom.getTime()) && now < validFrom) {
                  return false
                }
              }

              // Valid Until check.
              if (combo.validUntil) {
                const validUntil = new Date(combo.validUntil)

                if (!Number.isNaN(validUntil.getTime()) && now > validUntil) {
                  return false
                }
              }

              return true
            })
          : []

        setCombos(availableCombos)
      } catch (err) {
        // Combo API fail hone par food menu normal working rahega.
        console.error('Combo fetch error:', err)
        setCombos([])
      }
    }

    loadCombos()

    return () => {
      cancelled = true
    }
  }, [])

  // ======================================================
  // REFRESH MENU
  // ======================================================

  const refreshFoods = async () => {
    try {
      setRefreshing(true)
      setError('')

      // --------------------------------------------------
      // Refresh normal foods
      // --------------------------------------------------

      const foodResponse = await fetch('http://localhost:5000/api/foods')

      if (!foodResponse.ok) {
        throw new Error('Failed to fetch foods')
      }

      const foodData = await foodResponse.json()

      const availableFoods = Array.isArray(foodData.foods)
        ? foodData.foods.filter(food => food.available !== false)
        : []

      setFoods(availableFoods)

      // --------------------------------------------------
      // Refresh combo offers
      // --------------------------------------------------

      try {
        const comboResponse = await fetch('http://localhost:5000/api/combos')

        if (comboResponse.ok) {
          const comboData = await comboResponse.json()
          const now = new Date()

          const availableCombos = Array.isArray(comboData.combos)
            ? comboData.combos.filter(combo => {
                if (combo.available === false) {
                  return false
                }

                if (combo.validFrom) {
                  const validFrom = new Date(combo.validFrom)

                  if (!Number.isNaN(validFrom.getTime()) && now < validFrom) {
                    return false
                  }
                }

                if (combo.validUntil) {
                  const validUntil = new Date(combo.validUntil)

                  if (!Number.isNaN(validUntil.getTime()) && now > validUntil) {
                    return false
                  }
                }

                return true
              })
            : []

          setCombos(availableCombos)
        }
      } catch (comboError) {
        // Combo refresh fail hone par existing food menu affect nahi hoga.
        console.error('Combo refresh error:', comboError)
      }
    } catch (err) {
      console.error('Food refresh error:', err)

      setError('Food menu refresh nahi ho paya.')
    } finally {
      setRefreshing(false)
    }
  }

  // ======================================================
  // CATEGORY CHANGE
  // ======================================================

  const handleCategoryChange = category => {
    setSelectedCategory(category)

    if (category === 'All') {
      setSearchParams({})
    } else {
      setSearchParams({
        category: category
      })
    }
  }

  // ======================================================
  // SEARCH + CATEGORY FILTER
  // ======================================================

  const filteredFoods = useMemo(() => {
    const search = searchText.trim().toLowerCase()

    return foods.filter(food => {
      // Food name
      const name = (food.name || '').toLowerCase()

      // Food category
      const category = (food.category || '').toLowerCase()

      // Search match
      const searchMatch =
        search === '' || name.includes(search) || category.includes(search)

      // Category match
      const categoryMatch =
        selectedCategory === 'All' ||
        category === selectedCategory.toLowerCase() ||
        (selectedCategory === 'Aloo Paratha' && name.includes('aloo paratha'))

      // Both conditions must match
      return searchMatch && categoryMatch
    })
  }, [foods, searchText, selectedCategory])

  // ======================================================
  // COMBO HELPER FUNCTIONS
  // ======================================================

  // Combo ka display name safely return karta hai.
  const getComboName = combo => {
    return combo.name || combo.title || 'Special Combo'
  }

  // Combo ka original price safely return karta hai.
  const getComboOriginalPrice = combo => {
    const value = combo.originalPrice ?? combo.original_price ?? 0

    const price = Number(value)

    return Number.isFinite(price) ? price : 0
  }

  // Combo ka final/selling price safely return karta hai.
  const getComboPrice = combo => {
    const value = combo.comboPrice ?? combo.price ?? 0

    const price = Number(value)

    return Number.isFinite(price) ? price : 0
  }

  // Combo ke selected food items safely return karta hai.
  const getComboItems = combo => {
    if (Array.isArray(combo.items)) {
      return combo.items
    }

    if (Array.isArray(combo.foodItems)) {
      return combo.foodItems
    }

    return []
  }

  // Combo item ka naam safely extract karta hai.
  const getComboItemName = item => {
    // Agar item directly string hai.
    if (typeof item === 'string') {
      return item
    }

    // Normal populated food object.
    if (item?.name) {
      return item.name
    }

    // Agar food nested object me hai.
    if (item?.food?.name) {
      return item.food.name
    }

    // Agar foodId populated object hai.
    if (item?.foodId?.name) {
      return item.foodId.name
    }

    // Fallback.
    return 'Food item'
  }

  // Combo discount calculate karta hai.
  const getComboDiscount = combo => {
    const originalPrice = getComboOriginalPrice(combo)
    const comboPrice = getComboPrice(combo)

    if (originalPrice <= 0 || comboPrice <= 0 || comboPrice >= originalPrice) {
      return 0
    }

    return Math.round(((originalPrice - comboPrice) / originalPrice) * 100)
  }

  // ======================================================
  // ADD FOOD TO CART
  // ======================================================

  const addToCart = food => {
    // Existing cart
    const existingCart = JSON.parse(localStorage.getItem('cart')) || []

    // Check existing food
    const existingIndex = existingCart.findIndex(item => item._id === food._id)

    let updatedCart

    if (existingIndex !== -1) {
      // Increase quantity
      updatedCart = existingCart.map((item, index) => {
        if (index === existingIndex) {
          return {
            ...item,
            quantity: (item.quantity || 1) + 1
          }
        }

        return item
      })
    } else {
      // Add new food
      updatedCart = [
        ...existingCart,
        {
          ...food,
          quantity: 1
        }
      ]
    }

    // Save cart
    localStorage.setItem('cart', JSON.stringify(updatedCart))

    // Confirmation
    alert(`${food.name} added to cart! 🛒`)
  }

  // ======================================================
  // ADD COMBO TO CART
  // ======================================================

  const addComboToCart = combo => {
    // Combo ka actual price.
    const comboPrice = getComboPrice(combo)

    // Price missing ho to cart me invalid item add nahi karenge.
    if (comboPrice <= 0) {
      alert('This combo price is not available right now.')
      return
    }

    // Existing cart
    const existingCart = JSON.parse(localStorage.getItem('cart')) || []

    // Food ID aur combo ID same format me aa sakte hain,
    // isliye combo ke liye unique cart ID banayi ja rahi hai.
    const comboCartId = `combo-${combo._id}`

    // Check existing combo.
    const existingIndex = existingCart.findIndex(
      item => item._id === comboCartId
    )

    let updatedCart

    if (existingIndex !== -1) {
      // Existing combo ki quantity increase karo.
      updatedCart = existingCart.map((item, index) => {
        if (index === existingIndex) {
          return {
            ...item,
            quantity: (item.quantity || 1) + 1
          }
        }

        return item
      })
    } else {
      // Combo ko cart item ke form me save karo.
      updatedCart = [
        ...existingCart,
        {
          ...combo,

          // Unique cart ID.
          _id: comboCartId,

          // Original combo ID future use ke liye.
          comboId: combo._id,

          // Cart me item type identify karne ke liye.
          itemType: 'combo',

          // Display name.
          name: getComboName(combo),

          // Cart/checkout ke liye final price.
          price: comboPrice,

          // Original price preserve.
          originalPrice: getComboOriginalPrice(combo),

          // Initial quantity.
          quantity: 1
        }
      ]
    }

    // Save cart.
    localStorage.setItem('cart', JSON.stringify(updatedCart))

    // Confirmation.
    alert(`${getComboName(combo)} added to cart! 🎁🛒`)
  }

  // ======================================================
  // FOOD DETAILS
  // ======================================================

  const openFoodDetails = foodId => {
    navigate(`/food/${foodId}`)
  }

  // ======================================================
  // IMAGE ERROR HANDLER
  // ======================================================

  const handleImageError = event => {
    // Broken image ko hide karo.
    event.currentTarget.style.display = 'none'

    // Parent background visible rahega.
  }

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <section className='flex min-h-[70vh] items-center justify-center bg-orange-50'>
        <div className='text-center'>
          <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600'></div>

          <p className='mt-4 font-semibold text-gray-600'>
            Loading delicious food...
          </p>

          <p className='mt-1 text-sm text-gray-400'>Please wait a moment</p>
        </div>
      </section>
    )
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error && foods.length === 0) {
    return (
      <section className='flex min-h-[70vh] items-center justify-center bg-orange-50 px-6'>
        <div className='w-full max-w-md rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-xl'>
          <div className='text-6xl'>😕</div>

          <h2 className='mt-5 text-2xl font-black text-gray-900'>
            Something went wrong
          </h2>

          <p className='mt-2 text-sm leading-6 text-gray-500'>{error}</p>

          <button
            type='button'
            onClick={() => window.location.reload()}
            className='mt-6 rounded-full bg-orange-600 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-700 hover:shadow-lg'
          >
            Try Again
          </button>
        </div>
      </section>
    )
  }

  // ======================================================
  // MAIN MENU
  // ======================================================

  return (
    <section className='min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50 py-12 sm:py-16'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* ==================================================
            HEADER
        ================================================== */}
        <div className='mx-auto max-w-3xl text-center'>
          <div className='inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 shadow-sm'>
            <span>🍽️</span>
            <span>RK Restaurant</span>
          </div>

          <h1 className='mt-5 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl lg:text-6xl'>
            Our Delicious Menu
          </h1>

          <div className='mx-auto mt-5 flex items-center justify-center gap-2'>
            <div className='h-1 w-8 rounded-full bg-orange-200 sm:w-10'></div>

            <div className='h-1 w-14 rounded-full bg-orange-600 sm:w-16'></div>

            <div className='h-1 w-8 rounded-full bg-orange-200 sm:w-10'></div>
          </div>

          <p className='mx-auto mt-5 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base'>
            Discover your favorite dishes, explore something new, and order your
            meal with ease.
          </p>
        </div>
        {/* ==================================================
            SEARCH BAR
        ================================================== */}
        <div className='mx-auto mt-10 max-w-2xl'>
          <div className='group relative'>
            {/* Search icon */}
            <div className='pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl'>
              🔍
            </div>

            {/* Search input */}
            <input
              type='text'
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder='Search pizza, burger, noodles...'
              className='w-full rounded-2xl border border-orange-100 bg-white py-4 pl-14 pr-12 text-gray-800 shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
            />

            {/* Clear search */}
            {searchText && (
              <button
                type='button'
                onClick={() => setSearchText('')}
                className='absolute right-4 top-1/2 -translate-y-1/2 rounded-full px-2 text-lg text-gray-400 transition hover:bg-orange-50 hover:text-orange-600'
                aria-label='Clear search'
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {/* ==================================================
            CATEGORY BUTTONS
        ================================================== */}
        <div className='mt-8 overflow-x-auto pb-2'>
          <div className='flex min-w-max justify-center gap-3'>
            {categories.map(category => {
              const isActive = selectedCategory === category

              return (
                <button
                  key={category}
                  type='button'
                  onClick={() => handleCategoryChange(category)}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition duration-300 ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                      : 'border border-orange-100 bg-white text-gray-600 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>
        </div>
        {/* ==================================================
            COMBO OFFERS
        ================================================== */}
        {/* Important: combos state ko yahan actually use kiya gaya hai. Isliye
        "combos is assigned a value but never used" wala ESLint warning nahi
        aayega. */}
        {combos.length > 0 && (
          <section className='mt-12'>
            <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
              <div>
                <div className='inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-orange-600 shadow-sm'>
                  <span>🎁</span>
                  <span>Special Offers</span>
                </div>

                <h2 className='mt-3 text-3xl font-black text-gray-900 sm:text-4xl'>
                  Combo Offers
                </h2>

                <p className='mt-2 text-sm text-gray-500'>
                  Enjoy more food and save more with our special combos.
                </p>
              </div>

              <div className='rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700'>
                {combos.length} {combos.length === 1 ? 'Combo' : 'Combos'}{' '}
                Available
              </div>
            </div>

            {/* Combo cards */}
            <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
              {combos.map(combo => {
                const comboName = getComboName(combo)
                const originalPrice = getComboOriginalPrice(combo)
                const comboPrice = getComboPrice(combo)
                const discount = getComboDiscount(combo)
                const comboItems = getComboItems(combo)

                return (
                  <article
                    key={combo._id}
                    className='group overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-2xl'
                  >
                    {/* ==================================================
                        COMBO IMAGE
                    ================================================== */}

                    <div className='relative h-56 overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100'>
                      {combo.image ? (
                        <img
                          src={combo.image}
                          alt={comboName}
                          loading='lazy'
                          className='h-full w-full object-cover transition duration-500 group-hover:scale-110'
                          onError={handleImageError}
                        />
                      ) : (
                        <div className='flex h-full items-center justify-center text-7xl transition duration-500 group-hover:scale-110'>
                          🎁
                        </div>
                      )}

                      {/* Image overlay */}
                      <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent'></div>

                      {/* Combo badge */}
                      <div className='absolute left-4 top-4 rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-xs font-bold text-orange-700 shadow-md backdrop-blur-sm'>
                        🎁 Combo
                      </div>

                      {/* Discount badge */}
                      {discount > 0 && (
                        <div className='absolute right-4 top-4 rounded-full border border-white/50 bg-gray-900/90 px-3 py-1.5 text-xs font-black text-white shadow-md backdrop-blur-sm'>
                          {discount}% OFF
                        </div>
                      )}
                    </div>

                    {/* ==================================================
                        COMBO INFORMATION
                    ================================================== */}

                    <div className='p-5'>
                      {/* Combo title */}
                      <div className='flex items-start justify-between gap-3'>
                        <h3 className='text-xl font-black text-gray-900'>
                          {comboName}
                        </h3>

                        <span className='shrink-0 text-2xl'>🎁</span>
                      </div>

                      {/* Description */}
                      <p className='mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-gray-500'>
                        {combo.description ||
                          'Special food combination at an amazing price.'}
                      </p>

                      {/* ==================================================
                          COMBO ITEMS
                      ================================================== */}

                      {comboItems.length > 0 && (
                        <div className='mt-4'>
                          <p className='text-xs font-black uppercase tracking-wide text-gray-400'>
                            Included Items
                          </p>

                          <div className='mt-2 flex flex-wrap gap-2'>
                            {comboItems.slice(0, 4).map((item, index) => (
                              <span
                                key={`${combo._id}-item-${index}`}
                                className='rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700'
                              >
                                🍴 {getComboItemName(item)}
                              </span>
                            ))}

                            {comboItems.length > 4 && (
                              <span className='rounded-full bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-500'>
                                +{comboItems.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className='my-4 h-px bg-gray-100'></div>

                      {/* ==================================================
                          COMBO PRICE + ADD BUTTON
                      ================================================== */}

                      <div className='flex items-end justify-between gap-3'>
                        <div>
                          <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
                            Combo Price
                          </p>

                          <div className='mt-1 flex flex-wrap items-center gap-2'>
                            <span className='text-2xl font-black text-orange-600'>
                              ₹{comboPrice}
                            </span>

                            {originalPrice > comboPrice &&
                              originalPrice > 0 && (
                                <span className='text-sm font-bold text-gray-400 line-through'>
                                  ₹{originalPrice}
                                </span>
                              )}
                          </div>
                        </div>

                        <button
                          type='button'
                          onClick={() => addComboToCart(combo)}
                          className='rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-300 hover:bg-orange-600 hover:shadow-lg'
                        >
                          🛒 Add
                        </button>
                      </div>

                      {/* Savings message */}
                      {originalPrice > comboPrice && originalPrice > 0 && (
                        <div className='mt-4 rounded-xl bg-green-50 px-3 py-2 text-center text-xs font-bold text-green-700'>
                          🎉 You save ₹{originalPrice - comboPrice}
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}
        {/* ==================================================
            RESULT COUNT + REFRESH
        ================================================== */}
        <div className='mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-sm font-semibold text-gray-500'>
              Showing{' '}
              <span className='font-black text-orange-600'>
                {filteredFoods.length}
              </span>{' '}
              {filteredFoods.length === 1 ? 'food' : 'foods'}
            </p>

            {searchText && (
              <p className='mt-1 text-xs text-gray-400'>
                Search results for "{searchText}"
              </p>
            )}
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <div className='rounded-full border border-orange-100 bg-white px-4 py-2 text-xs font-bold text-orange-700 shadow-sm'>
              Category: {selectedCategory}
            </div>

            <button
              type='button'
              onClick={refreshFoods}
              disabled={refreshing}
              className='rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-bold text-orange-600 shadow-sm transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {refreshing ? '⏳ Refreshing...' : '🔄 Refresh Menu'}
            </button>
          </div>
        </div>
        {/* ==================================================
            REFRESH ERROR
        ================================================== */}
        {error && foods.length > 0 && (
          <div className='mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600'>
            {error}
          </div>
        )}
        {/* ==================================================
            FOOD CARDS
        ================================================== */}
        {filteredFoods.length > 0 ? (
          <div className='mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {filteredFoods.map(food => (
              <article
                key={food._id}
                className='group overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-orange-200 hover:shadow-2xl'
              >
                {/* ==================================================
                    FOOD IMAGE
                ================================================== */}

                <button
                  type='button'
                  onClick={() => openFoodDetails(food._id)}
                  className='block w-full text-left'
                  aria-label={`View details for ${food.name}`}
                >
                  <div className='relative h-56 overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100'>
                    {/* Food image */}
                    {food.image ? (
                      <img
                        src={food.image}
                        alt={food.name}
                        loading='lazy'
                        className='h-full w-full object-cover transition duration-500 group-hover:scale-110'
                        onError={handleImageError}
                      />
                    ) : (
                      <div className='flex h-full items-center justify-center text-7xl transition duration-500 group-hover:scale-110'>
                        {food.icon || '🍽️'}
                      </div>
                    )}

                    {/* Image overlay */}
                    <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-70'></div>

                    {/* Category badge */}
                    <div className='absolute left-4 top-4 rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-xs font-bold text-orange-700 shadow-md backdrop-blur-sm'>
                      {food.category || 'Food'}
                    </div>

                    {/* Popular choice badge */}
                    <div className='absolute right-4 top-4 flex items-center gap-1 rounded-full border border-white/50 bg-gray-900/85 px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-sm'>
                      <span>⭐</span>
                      <span>Popular Choice</span>
                    </div>

                    {/* View overlay */}
                    <div className='absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-800 opacity-0 shadow-md transition duration-300 group-hover:opacity-100'>
                      View Details →
                    </div>
                  </div>
                </button>

                {/* ==================================================
                    FOOD INFORMATION
                ================================================== */}

                <div className='p-5'>
                  {/* Food title */}
                  <div className='flex items-start justify-between gap-3'>
                    <h2 className='line-clamp-1 text-lg font-black text-gray-900'>
                      {food.name}
                    </h2>

                    <span className='shrink-0 text-xl'>
                      {food.icon || '🍽️'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className='mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-gray-500'>
                    {food.description ||
                      'Delicious food prepared specially for you.'}
                  </p>

                  {/* ==================================================
                      FOOD META
                  ================================================== */}

                  <div className='mt-4 flex items-center gap-2 text-xs font-semibold text-gray-400'>
                    <span className='rounded-full bg-orange-50 px-3 py-1.5 text-orange-600'>
                      🍴 Freshly Prepared
                    </span>

                    <span className='rounded-full bg-gray-50 px-3 py-1.5 text-gray-500'>
                      ✓ Available
                    </span>
                  </div>

                  {/* Divider */}
                  <div className='my-4 h-px bg-gray-100'></div>

                  {/* ==================================================
                      PRICE + ADD BUTTON
                  ================================================== */}

                  <div className='flex items-end justify-between gap-3'>
                    <div>
                      <p className='text-xs font-semibold uppercase tracking-wide text-gray-400'>
                        Price
                      </p>

                      <p className='mt-1 text-2xl font-black text-orange-600'>
                        ₹{food.price}
                      </p>
                    </div>

                    <button
                      type='button'
                      onClick={() => addToCart(food)}
                      className='rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-300 hover:bg-orange-600 hover:shadow-lg'
                    >
                      🛒 Add
                    </button>
                  </div>

                  {/* ==================================================
                      DETAILS BUTTON
                  ================================================== */}

                  <button
                    type='button'
                    onClick={() => openFoodDetails(food._id)}
                    className='mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-100 bg-orange-50/50 py-2.5 text-sm font-bold text-orange-600 transition hover:border-orange-200 hover:bg-orange-50'
                  >
                    <span>View Details</span>
                    <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          /* ==================================================
             NO FOOD FOUND
          ================================================== */

          <div className='mt-12 rounded-3xl border border-orange-100 bg-white px-6 py-16 text-center shadow-sm'>
            <div className='text-6xl'>🍽️</div>

            <h2 className='mt-5 text-2xl font-black text-gray-900'>
              No food found
            </h2>

            <p className='mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500'>
              Try another search term or choose a different category.
            </p>

            <button
              type='button'
              onClick={() => {
                setSearchText('')
                handleCategoryChange('All')
              }}
              className='mt-6 rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-700 hover:shadow-lg'
            >
              Show All Foods
            </button>
          </div>
        )}
        {/* ==================================================
            CART BUTTON
        ================================================== */}
        {(filteredFoods.length > 0 || combos.length > 0) && (
          <div className='mt-14 text-center'>
            <button
              type='button'
              onClick={() => navigate('/cart')}
              className='rounded-full bg-gray-900 px-7 py-3 font-bold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-orange-600'
            >
              🛒 Go to Cart
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
// ======================================================
// EXPORT
// ======================================================
export default Menu
