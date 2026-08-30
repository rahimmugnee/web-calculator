import { forwardRef } from "react";

const scopeItems = [
  "Transportation of all equipment to the venue and return",
  "Installation & dismantling of LED display and sound system",
  "Cabling, power distribution & connection",
  "LED configuration, mapping & testing",
  "Operation & live technical support during the event",
  "Provision of skilled technical engineers throughout the event",
  "System monitoring & on-site troubleshooting",
  "Dismantling & safe packing after the event",
];

const noteItems = [
  "Please confirm your acceptance by signing & returning a copy of this quotation.",
  "Setup time will be as per the event schedule.",
  "All equipment will remain the property of Mugnee Multiple Limited.",
  "This quotation is prepared based on the given requirements and scope of work.",
];

const termsItems = [
  "Quotation validity: 3 (Three) days from the date of issue.",
  "Prices are {vatText}.",
  "Client is responsible to provide stable power supply, safe working area & necessary security.",
  "Any damage to equipment due to negligence, mishandling or improper use will be charged at actual cost.",
  "Additional equipment or services beyond this quotation will be charged separately.",
  "Overtime / extended hour (if any) will be charged as per actual.",
  "In case of cancellation, advance payment is non-refundable.",
  "Force majeure events beyond our control may affect the schedule.",
];

function SectionTitle({ icon, children }) {
  return (
    <div className="rental-terms-title">
      <span className="rental-terms-icon">{icon}</span>
      <strong>{children}</strong>
      <span className="rental-terms-line" />
    </div>
  );
}

const RentalTermsPage = forwardRef(function RentalTermsPage({ calc }, ref) {
  const vatText = calc?.totals?.vatEnabled ? "inclusive of VAT & Tax" : "exclusive of VAT & Tax";

  return (
    <div ref={ref} className="rental-terms-page">
      <div className="rental-terms-grid">
        <div className="rental-terms-col">
          <section className="rental-terms-block scope-block">
            <SectionTitle icon="SO">Scope Of Work</SectionTitle>
            <ul className="rental-scope-list">
              {scopeItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rental-terms-block">
            <SectionTitle icon="!">Important Notes</SectionTitle>
            <ul className="rental-dot-list">
              {noteItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="rental-terms-block">
            <SectionTitle icon="BI">Bank Information</SectionTitle>
            <table className="rental-bank-table">
              <tbody>
                <tr><th>Account Name</th><td>Mugnee Multiple Limited</td></tr>
                <tr><th>Bank Name</th><td>Eastern Bank PLC.</td></tr>
                <tr><th>Branch</th><td>Lalbagh Branch, Dhaka</td></tr>
                <tr><th>Account Number</th><td>1267 1234 5678</td></tr>
                <tr><th>Routing Number</th><td>095260273</td></tr>
                <tr><th>Currency</th><td>BDT (Bangladeshi Taka)</td></tr>
              </tbody>
            </table>
          </section>
        </div>

        <div className="rental-terms-col">
          <section className="rental-terms-block">
            <SectionTitle icon="PT">Payment Terms</SectionTitle>
            <div className="rental-payment-box">
              <div className="rental-payment-row">
                <span className="rental-payment-mark">OK</span>
                <p><b>100% Advance Payment</b> against Work Order / Confirmation.</p>
              </div>
              <div className="rental-payment-row">
                <span className="rental-payment-mark">GO</span>
                <p>Work will commence after payment confirmation.</p>
              </div>
            </div>
          </section>

          <section className="rental-terms-block">
            <SectionTitle icon="TC">Terms & Conditions</SectionTitle>
            <ol className="rental-number-list">
              {termsItems.map((item, index) => (
                <li key={item}>
                  <span>{index + 1}</span>
                  {item.replace("{vatText}", vatText)}
                </li>
              ))}
            </ol>
          </section>

          <section className="rental-terms-block contact-block">
            <SectionTitle icon="CI">Contact Information</SectionTitle>
            <div className="rental-contact-grid">
              <div className="rental-contact-lines">
                <div><b>Phone:</b> +8801711927445</div>
                <div><b>Phone:</b> +8801711927446</div>
                <div><b>Email:</b> info@mugnee.com</div>
                <div><b>Website:</b> www.mugnee.com</div>
                <div><b>Address:</b> 6-37 Umesh Datta Road, Bakshibazar, Dhaka - 1211</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="rental-thanks">
        <div>Thank You!</div>
        <p>Thank you for your valuable inquiry. We look forward to serving your event with our best technology & professional support.</p>
      </div>
    </div>
  );
});

export default RentalTermsPage;
