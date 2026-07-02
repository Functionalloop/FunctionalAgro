export default function OutbreakBanner({ outbreak }) {
  if (!outbreak?.outbreak) return null

  return (
    <div className="outbreak-banner" id="outbreak-banner">
      <div className="outbreak-icon">🚨</div>
      <div>
        <div className="outbreak-title">
          OUTBREAK ALERT — {outbreak.crop} {outbreak.disease}
        </div>
        <div className="outbreak-text">
          {outbreak.count} cases detected near pincode <strong>{outbreak.pincode}</strong> in the
          last {outbreak.window_days} days. Advise neighbouring farmers to inspect their crops immediately.
        </div>
      </div>
    </div>
  )
}
