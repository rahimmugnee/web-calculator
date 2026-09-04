import { forwardRef } from "react";
import RentalTermsPage from "./RentalTermsPage.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";

function renderPaymentTerms(paymentTermId, subjectLabel = "LED display system") {
  switch (paymentTermId) {
    case "PT_50_50":
      return (
        <ol type="i" className="terms-sublist">
          <li>
            <b>50%</b> (Fifty Percent) of the total contract value shall be payable upon confirmation of the order.
          </li>
          <li>
            The remaining <b>50%</b> (Fifty Percent) shall become due and payable upon arrival of the {subjectLabel}
            at the project site, and <b>before any installation work is initiated</b>.
          </li>
        </ol>
      );

    case "PT_100":
      return (
        <ol type="i" className="terms-sublist">
          <li>
            <b>100%</b> (One Hundred Percent) of the total contract value shall be payable <b>in advance</b> upon confirmation
            of the order.
          </li>
        </ol>
      );

    case "PT_NO_ADV_7D":
      return (
        <ol type="i" className="terms-sublist">
          <li>
            No advance payment is required. The full amount shall be payable within <b>7 (seven)</b> days from the date of
            delivery of the {subjectLabel}.
          </li>
        </ol>
      );

    // default PT_75_25
    default:
      return (
        <ol type="i" className="terms-sublist">
          <li>
            <b>75%</b> (Seventy-Five Percent) of the total contract value shall be payable upon confirmation of the order.
          </li>
          <li>
            The remaining <b>25%</b> (Twenty-Five Percent) shall become due and payable upon arrival of the {subjectLabel}
            at the project site, and <b>before any installation work is initiated</b>.
          </li>
        </ol>
      );
  }
}

const TermsPage = forwardRef(function TermsPage({ snapshot, calc }, ref) {
  const { quotationSettings, company } = useCatalog();
  const configuredTerms = Array.isArray(quotationSettings?.terms)
    ? quotationSettings.terms.map((term) => typeof term === "string" ? term : term?.text || term?.label || "").filter(Boolean)
    : [];
  const validityDays = Number.isFinite(Number(quotationSettings?.default_validity_days))
    ? Math.max(0, Number(quotationSettings.default_validity_days))
    : 15;
  if (snapshot?.quotationType === "rental") {
    return <RentalTermsPage ref={ref} calc={calc} snapshot={snapshot} company={company} quotationSettings={quotationSettings} />;
  }

  const totals = calc?.totals;

  const customWarrantyRaw = (snapshot?.customWarranty ?? "").toString().trim();
  const customYearsNum = parseFloat(customWarrantyRaw);

  const officialYears =
    Number.isFinite(customYearsNum) && customYearsNum > 0
      ? customYearsNum
      : Number(snapshot?.defaultWarrantyYears) || 1;

  const vatWording = totals?.vatEnabled
    ? "inclusive of VAT & taxes"
    : "exclusive of VAT & taxes";

  const paymentTermId = snapshot?.paymentTermId || "PT_75_25";
  const deliveryDays = Number.isFinite(parseFloat(snapshot?.deliveryDays))
    ? Math.max(1, Math.round(parseFloat(snapshot.deliveryDays)))
    : Math.max(1, parseInt(quotationSettings?.default_delivery_period, 10) || 30);
  const subjectLabel =
    snapshot?.quotationType === "conference"
      ? "Conference System"
      : snapshot?.quotationType === "pa"
      ? "PA System"
      : "LED Display";
  const subjectDeliveryLabel = `${subjectLabel.charAt(0).toLowerCase()}${subjectLabel.slice(1)}`;

  return (
    <div ref={ref} className="terms-page">
      <div className="invoice-panel terms-panel">
        <div className="terms-title">Terms &amp; Conditions</div>

        <ol className="terms-list">
          <li className="terms-section">
            <div className="terms-h">Currency &amp; Validity</div>
            <ol type="i" className="terms-sublist">
              <li>All prices quoted are in Bangladeshi Taka (BDT).</li>
              <li>
                The quoted price is <b>{vatWording}</b>.
              </li>
              <li>
                The quoted price includes <b>complete system making, installation, testing, and commissioning</b> of the {subjectLabel}. There are no additional charges for these services.
              </li>
              <li>
                This quotation is valid for a period of <b>{validityDays} day(s)</b> from the date of issuance.
              </li>
              <li>
                Delivery will be made within <b>{deliveryDays} days</b> from the date of the work order.
              </li>
            </ol>
          </li>

          <li className="terms-section">
            <div className="terms-h">Payment Terms</div>
            <div className="terms-p">Payment shall be made in the following stages:</div>

            {/* ✅ Dynamic payment terms based on selected option */}
            {renderPaymentTerms(paymentTermId, subjectDeliveryLabel)}
          </li>

          <li className="terms-section">
            <div className="terms-h">Warranty &amp; Guarantee Policy (Based on Quality)</div>
            <ol type="i" className="terms-sublist">
              <li>
                <b>Official Warranty:</b> {officialYears}-year(s) full coverage including spare parts and service free of charge.
              </li>
              <li>
                <b>Post-Warranty Support:</b> Comprehensive service support will be provided for a duration of 5 (Five) years on a
                cost basis. During this period, any spare parts required shall be borne by the client.
              </li>
              <li>
                Warranty does not cover damages caused by physical impact, over-voltage, over-current, short circuit, fire, water
                ingress, natural disasters, or mishandling by the user.
              </li>
            </ol>
          </li>

          <li className="terms-section">
            <div className="terms-h">After-Sales Support</div>
            <ol type="i" className="terms-sublist">
              <li>Our technical support team will be available during office hours for troubleshooting and guidance.</li>
              <li>Emergency support can be arranged on a priority basis depending on the issue.</li>
            </ol>
          </li>
          {configuredTerms.length ? (
            <li className="terms-section">
              <div className="terms-h">Additional Terms</div>
              <ol type="i" className="terms-sublist">
                {configuredTerms.map((term, index) => <li key={`${index}-${term}`}>{term}</li>)}
              </ol>
            </li>
          ) : null}
        </ol>
      </div>
    </div>
  );
});

export default TermsPage;
