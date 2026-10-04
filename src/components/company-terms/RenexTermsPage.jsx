import { Children, forwardRef, isValidElement } from "react";
import "./RenexTermsPage.css";

// Image-backed vectors also survive the quotation's native PDF image renderer.
const svgImage = (body, viewBox = "0 0 32 32") =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`)}`;
const iconPaths = [
  '<path d="M7 3h12l7 7v19H7z M19 3v8h7 M11 15h11 M11 20h11 M11 25h8"/>',
  '<rect x="3" y="6" width="26" height="20" rx="3"/><path d="M3 12h26 M7 17h6v5H7z M18 18h7 M18 22h4"/>',
  '<path d="M16 2 28 7v9c0 7-6 11-12 14C10 27 4 23 4 16V7z M10 15l4 4 8-9"/>',
  '<path d="M5 20v-5a11 11 0 0 1 22 0v5 M7 15H4v9h5v-9z M25 15h3v9h-5v-9z M26 24c0 4-4 5-9 5"/><path d="M14 27h5v3h-5z"/>',
];
const icons = iconPaths.map((path) => svgImage(`<g fill="none" stroke="#09213e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${path}</g>`));
const badge = svgImage('<path fill="#ffdc00" d="M8 0h72L64 58H8z"/><path fill="#09213e" d="M7 0h64L55 58H7Q0 58 0 51V7Q0 0 7 0"/>', "0 0 80 58");

const RenexTermsPage = forwardRef(function RenexTermsPage({ children }, ref) {
  const sections = Children.toArray(children).filter(isValidElement);
  return (
    <div ref={ref} className="terms-page terms-format-renex">
      <header className="renex-terms-heading">
        <div className="renex-terms-heading-main">
          <div className="renex-terms-eyebrow"><span>QUOTATION</span><span className="renex-terms-rule" /></div>
          <h1>TERMS &amp; CONDITIONS</h1>
          <div className="renex-terms-subtitle">COMMERCIAL TERMS · WARRANTY · SUPPORT</div>
          <div className="renex-terms-accent" />
        </div>
        <div className="renex-terms-tagline">SMART SOLUTIONS<br />FOR A CONNECTED<br />TOMORROW</div>
      </header>
      <div className="renex-terms-sections">
        {sections.map((section, index) => {
          const [heading, ...content] = Children.toArray(section.props.children);
          return (
            <section className={`renex-terms-section${index === 1 ? " renex-terms-section-payment" : ""}`} key={section.key || index}>
              <div className="renex-terms-number"><img src={badge} alt="" /><span>{String(index + 1).padStart(2, "0")}</span></div>
              <div className="renex-terms-section-body">
                <div className="renex-terms-section-heading">
                  <img src={icons[index] || icons[0]} alt="" />
                  <h2>{heading.props.children}</h2>
                </div>
                {content}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
});

export default RenexTermsPage;
