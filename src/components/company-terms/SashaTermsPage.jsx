import { Children, forwardRef, isValidElement } from "react";
import "./SashaTermsPage.css";

const svgImage = (body, viewBox = "0 0 32 32") =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`)}`;
const iconPaths = [
  '<ellipse cx="11" cy="7" rx="8" ry="4"/><path d="M3 7v5c0 5 16 5 16 0V7 M3 12v5c0 3 6 5 11 4"/><ellipse cx="22" cy="20" rx="8" ry="4"/><path d="M14 20v5c0 5 16 5 16 0v-5 M14 25v3c0 4 16 4 16 0v-3"/>',
  '<rect x="2" y="5" width="28" height="22" rx="2"/><path d="M2 12h28 M19 18h7 M16 23h10"/>',
  '<path d="M16 2 28 7v9c0 7-6 11-12 14C10 27 4 23 4 16V7z M10 15l4 4 8-9"/>',
  '<path d="M5 20v-5a11 11 0 0 1 22 0v5 M7 15H4v9h5v-9z M25 15h3v9h-5v-9z M26 24c0 4-4 5-9 5 M14 27h5v3h-5z"/>',
];
const icons = iconPaths.map((path) => svgImage(`<g fill="none" stroke="#ed003d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${path}</g>`));
const badge = svgImage('<path fill="#ed003d" d="M0 0h42l20 46H0z"/><path fill="#ffe2e9" d="M46 0h10l20 46H66z"/>', "0 0 76 46");
const headerSlant = svgImage('<path fill="#e9ebef" d="M0 0h4l26 46h-4z"/>', "0 0 30 46");
const paymentIcon = svgImage('<g fill="none" stroke="#ed003d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h14l7 7v21H6z M20 2v8h7 M10 13h10 M13 11v12c0 5 10 5 10-1v-3h-6 M11 17l8 3"/></g>');
const taglines = [
  <>CLEAR TERMS<br />STRONGER PARTNERSHIPS</>,
  <>SECURE PROCESS<br />SMOOTH EXECUTION</>,
  <>BUILT FOR RELIABILITY<br />BACKED BY SUPPORT</>,
  <>ALWAYS HERE<br />WHEN YOU NEED US</>,
];

const SashaTermsPage = forwardRef(function SashaTermsPage({ children }, ref) {
  const sections = Children.toArray(children).filter(isValidElement);
  return (
    <div ref={ref} className="terms-page terms-format-sasha">
      <header className="sasha-terms-heading">
        <h1>TERMS &amp; <span>CONDITIONS</span></h1>
        <div className="sasha-terms-subtitle">COMMERCIAL TERMS · WARRANTY · SUPPORT</div>
        <div className="sasha-terms-accent" />
      </header>
      {sections.map((section, index) => {
        const [heading, ...content] = Children.toArray(section.props.children);
        const payment = index === 1;
        return (
          <section className={`sasha-terms-section${payment ? " sasha-terms-payment" : ""}`} key={section.key || index}>
            <div className="sasha-terms-section-heading">
              <div className="sasha-terms-letter"><img src={badge} alt="" /><span>{String.fromCharCode(65 + index)}.</span></div>
              <img className="sasha-terms-icon" src={icons[index] || icons[0]} alt="" />
              <h2>{heading.props.children}</h2>
              {taglines[index] && <div className="sasha-terms-tagline"><img src={headerSlant} alt="" /><span>{taglines[index]}</span></div>}
            </div>
            <div className="sasha-terms-section-content">
              {content.map((block, blockIndex) => {
                if (block.type !== "ol") return block;
                return (
                  <div className={`sasha-terms-rows${payment ? " sasha-terms-payment-box" : ""}`} key={blockIndex}>
                    {payment && <img className="sasha-terms-payment-icon" src={paymentIcon} alt="" />}
                    <ol className="sasha-terms-row-list">
                      {Children.toArray(block.props.children).filter(isValidElement).map((row, rowIndex) => (
                        <li className="sasha-terms-row" key={row.key || rowIndex}>
                          <span className="sasha-terms-row-number">{String(rowIndex + 1).padStart(2, "0")}</span>
                          <div className="sasha-terms-row-copy">{row.props.children}</div>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
});

export default SashaTermsPage;
