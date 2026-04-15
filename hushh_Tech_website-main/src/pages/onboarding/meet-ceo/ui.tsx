/**
 * Meet CEO — Premium Hushh design (refactored version using useMeetCeoLogic).
 * Payment → Calendar → Booked flow.
 */
import { useMeetCeoLogic } from './logic';
import HushhTechBackHeader from '../../../components/hushh-tech-back-header/HushhTechBackHeader';
import HushhTechCta, { HushhTechCtaVariant } from '../../../components/hushh-tech-cta/HushhTechCta';

function MeetCeoPage() {
  const {
    paymentState,
    loading,
    error,
    hushhCoins,
    showCoupon,
    setShowCoupon,
    couponCode,
    setCouponCode,
    couponError,
    setCouponError,
    couponLoading,
    calendarData,
    loadingSlots,
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    bookingInProgress,
    handlePayment,
    handleCouponRedeem,
    handleBookMeeting,
    handleContinue,
    handleBack,
  } = useMeetCeoLogic();

  /* ── Loading / Verifying ── */
  if (paymentState === 'loading' || paymentState === 'verifying') {
    return (
      <div className="bg-white min-h-screen flex flex-col antialiased selection:bg-hushh-blue selection:text-white">
        <HushhTechBackHeader onBackClick={handleBack} rightLabel="FAQs" />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full border-4 border-gray-200 border-t-hushh-blue animate-spin" />
            <p className="text-sm text-gray-500 font-light">{paymentState === 'verifying' ? 'Verifying payment...' : 'Loading...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      <HushhTechBackHeader onBackClick={handleBack} rightLabel="FAQs" />

      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-48">
        {/* Title */}
        <section className="py-8">
          <h3 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mb-4 font-medium">Verification</h3>
          <h1 className="text-[2.75rem] leading-[1.1] font-normal text-black tracking-tight font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
            Meet Your
            <br />
            <span className="text-gray-400 italic font-light">Fund Manager</span>
          </h1>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 py-4 px-1 border-b border-red-100">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-500 text-lg" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>error</span>
            </div>
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* ═══ NOT PAID ═══ */}
        {paymentState === 'not_paid' && (
          <>
            {/* Manager intro */}
            <div className="py-5 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 block">Manish Sainani</span>
                  <span className="text-xs text-gray-500 font-medium">Hedge Fund Manager · 1-hour private session</span>
                </div>
              </div>
            </div>

            {/* Story card */}
            <div className="my-6 bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                A personal consultation with Manish typically costs <span className="font-bold text-gray-900">$3,000</span> per session.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                Because you've completed the full Hushh KYC onboarding, you've unlocked this as an <span className="font-semibold text-gray-900">exclusive benefit</span> — available for just <span className="font-bold text-black">$1</span>.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed font-light">
                Your opportunity to sit 1-on-1 with a fund manager for investment strategies, portfolio allocation, and personalized guidance.
              </p>
            </div>

            {/* Benefits list */}
            <section className="space-y-0 mb-6">
              <div className="py-4">
                <h3 className="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-medium">What You Unlock</h3>
              </div>
              {[
                { icon: 'calendar_month', label: '1-Hour Private Consultation', desc: 'With Manish Sainani', extra: '$3,000', filled: true },
                { icon: 'monetization_on', label: '300,000 Hushh Coins', desc: 'Credited instantly', filled: false },
                { icon: 'verified', label: 'KYC Verified Badge', desc: 'Identity verification complete', filled: false },
              ].map((item) => (
                <div key={item.icon} className="py-5 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.filled ? 'bg-hushh-blue' : 'bg-gray-100'}`}>
                      <span className={`material-symbols-outlined text-lg ${item.filled ? 'text-white' : 'text-gray-700'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 block">{item.label}</span>
                      <span className="text-xs text-gray-500 font-medium">{item.desc}</span>
                    </div>
                    {item.extra && <span className="text-xs font-medium text-gray-400 line-through">{item.extra}</span>}
                  </div>
                </div>
              ))}
            </section>

            {/* Price card */}
            <section className="mb-6">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <div className="flex flex-col items-center text-center gap-1">
                  <span className="text-[10px] tracking-[0.2em] text-gray-400 uppercase font-medium">Your Price Today</span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-black tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>$1</span>
                    <span className="text-sm text-gray-400 line-through">$3,000</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-light mt-1">Exclusive KYC onboarding benefit</span>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="pb-6 space-y-3">
              <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={handlePayment} disabled={loading}>
                {loading ? 'Redirecting...' : 'Verify & Unlock — $1'}
              </HushhTechCta>
            </section>

            {/* Coupon */}
            <div className="mb-6">
              <button onClick={() => setShowCoupon(!showCoupon)} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-gray-700 font-semibold lowercase active:opacity-60">
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'wght' 400" }}>confirmation_number</span>
                {showCoupon ? 'hide coupon code' : 'have a coupon code?'}
              </button>
              {showCoupon && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text" value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                      placeholder="enter coupon code"
                      className="flex-1 h-12 px-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-black focus:ring-1 focus:ring-black font-mono tracking-widest lowercase"
                      autoCapitalize="characters" autoComplete="off"
                    />
                    <button onClick={handleCouponRedeem} disabled={couponLoading || !couponCode.trim()}
                      className="h-12 px-5 rounded-xl bg-black text-white text-sm font-semibold disabled:bg-gray-300 active:scale-[0.97] transition-all">
                      {couponLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 text-center font-medium lowercase">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Security */}
            <section className="flex flex-col items-center text-center gap-1 pb-8">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-hushh-blue">lock</span>
                <span className="text-[10px] text-gray-500 tracking-wide uppercase font-medium">Secure Payment</span>
              </div>
              <p className="text-[10px] text-gray-400 font-light">Powered by Stripe</p>
            </section>
          </>
        )}

        {/* ═══ PAID — Calendar ═══ */}
        {paymentState === 'paid' && (
          <>
            <div className="py-5 border-b border-gray-200 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-ios-green/10 border border-ios-green/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-ios-green text-2xl" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>check_circle</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 block">You're Verified!</span>
                  <span className="text-xs text-gray-500 font-medium"><span className="font-bold text-gray-900">{hushhCoins.toLocaleString()} Hushh Coins</span> credited</span>
                </div>
              </div>
            </div>

            <div className="mb-6 bg-gray-50 rounded-2xl p-5 border border-gray-200 text-center">
              <span className="text-sm font-semibold text-gray-900 block mb-1">Schedule Your Consultation</span>
              <span className="text-xs text-gray-500 font-medium">Book a 1-hour session with {calendarData?.ceo.name || 'Manish Sainani'}</span>
              {calendarData?.timezone && <p className="text-[10px] text-gray-400 mt-1">{calendarData.timezone}</p>}
            </div>

            {loadingSlots && (
              <div className="flex flex-col items-center py-12">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-hushh-blue rounded-full animate-spin mb-3" />
                <p className="text-xs text-gray-500 font-light">Loading times...</p>
              </div>
            )}

            {!loadingSlots && calendarData && (
              <div className="space-y-4 mb-8">
                {/* Date pills */}
                <div className="overflow-x-auto pb-2 -mx-2 px-2">
                  <div className="flex gap-2">
                    {calendarData.availability.map((day) => {
                      const d = new Date(day.date);
                      const sel = selectedDate === day.date;
                      const has = day.slots.some(s => s.available);
                      return (
                        <button key={day.date} onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }} disabled={!has}
                          className={`shrink-0 flex flex-col items-center p-2.5 rounded-xl min-w-[62px] border-2 transition-all ${sel ? 'border-black bg-gray-50' : has ? 'border-gray-200 active:bg-gray-50' : 'border-transparent opacity-40'}`}>
                          <span className="text-[10px] font-medium text-gray-500 uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className={`text-[18px] font-bold ${sel ? 'text-black' : 'text-gray-900'}`}>{d.getDate()}</span>
                          <span className="text-[10px] text-gray-500">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="rounded-xl border border-gray-200 p-3">
                    <p className="text-xs font-semibold text-gray-900 mb-2">Available Times</p>
                    <div className="grid grid-cols-3 gap-2">
                      {calendarData.availability.find(d => d.date === selectedDate)?.slots.filter(s => s.available).map(slot => {
                        const t = new Date(slot.startTime);
                        const sel = selectedSlot?.startTime === slot.startTime;
                        return (
                          <button key={slot.startTime} onClick={() => setSelectedSlot(slot)}
                            className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all lowercase ${sel ? 'bg-black text-white' : 'bg-gray-50 text-gray-900 active:bg-gray-200'}`}>
                            {t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </button>
                        );
                      })}
                    </div>
                    {calendarData.availability.find(d => d.date === selectedDate)?.slots.filter(s => s.available).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4 font-light">No slots available</p>
                    )}
                  </div>
                )}

                {/* Selected summary */}
                {selectedSlot && (
                  <div className="py-4 px-1 border-b border-gray-200 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>event_available</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{new Date(selectedSlot.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      <p className="text-xs text-gray-500">{new Date(selectedSlot.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – {new Date(selectedSlot.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                    </div>
                  </div>
                )}

                <section className="space-y-3 pt-4">
                  <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={handleBookMeeting} disabled={!selectedSlot || bookingInProgress}>
                    {bookingInProgress ? 'Booking...' : selectedSlot ? 'Confirm Booking' : 'Select a Time'}
                  </HushhTechCta>
                  <HushhTechCta variant={HushhTechCtaVariant.WHITE} onClick={handleContinue}>
                    I'll Book Later
                  </HushhTechCta>
                </section>
              </div>
            )}
          </>
        )}

        {/* ═══ BOOKED ═══ */}
        {paymentState === 'booked' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-ios-green/10 border border-ios-green/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-ios-green text-[44px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>task_alt</span>
            </div>
            <h1 className="text-3xl font-normal text-black tracking-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>All Set!</h1>
            <p className="text-sm text-gray-500 mb-1 font-light">Your consultation is scheduled with</p>
            <p className="text-base font-semibold text-black">Manish Sainani</p>
            <p className="text-xs text-gray-500 mt-1">{hushhCoins.toLocaleString()} Hushh Coins earned 🪙</p>
            <section className="w-full space-y-3 mt-8">
              <HushhTechCta variant={HushhTechCtaVariant.BLACK} onClick={handleContinue}>
                Continue to Profile
              </HushhTechCta>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default MeetCeoPage;
