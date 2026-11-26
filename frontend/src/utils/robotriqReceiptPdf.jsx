import { renderRobotriqPdf } from './robotriqPdf';
import './robotriqReceiptPdf.css';
import LogoImg from '../assets/robotriq-receipt-logo.png';
import SignPrabha from '../assets/robotriq-receipt-sign.png';
import SealImg from '../assets/robotriq-receipt-seal.png';

const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const money = value => value == null ? 'Unavailable' : '₹ ' + numberFormat.format(value);
const dateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value || '---';

const units = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function integerWords(value) {
  if (value < 20) return units[value];
  const group = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [100, 'Hundred']]
    .find(([size]) => value >= size);
  if (group) {
    const [size, label] = group;
    const remainder = value % size;
    return integerWords(Math.floor(value / size)) + ' ' + label + (remainder ? ' ' + integerWords(remainder) : '');
  }
  return tens[Math.floor(value / 10)] + (value % 10 ? ' ' + units[value % 10] : '');
}

function amountInWords(amount) {
  if (amount == null) return 'Unavailable';
  const paise = Math.round(amount * 100);
  if (!Number.isSafeInteger(paise) || paise < 0) return 'Unavailable';
  return integerWords(Math.floor(paise / 100)) + ' Rupees' +
    (paise % 100 ? ' and ' + integerWords(paise % 100) + ' Paise' : '') + ' Only';
}

function ReceiptContent({ row }) {
  const balanceAmount = row.balance;
  const totalPaid = row.previouslyPaid == null || row.amount == null ? null :
    (Math.round(row.previouslyPaid * 100) + Math.round(row.amount * 100)) / 100;
  return (
  <div className="robotriq-legacy-receipt">
    <div className="robotriq-receipt-rule"></div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '10px' }}>
      <div>
        <img src={LogoImg} alt="Logo" style={{ height: '45px', objectFit: 'contain', marginLeft: '-10px', marginBottom: '10px' }} />
        <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 'bold', color: '#0d9488', letterSpacing: '0.5px' }}>INDUSTRIAL AUTOMATION TRAINING CENTRE</div>
        <div style={{ fontSize: '11px', color: '#475569', lineHeight: '1.6', marginTop: '5px' }}>
          Door No. 321/1, Pollachi Main Road, SIDCO PO,<br/> Coimbatore – 641 021, Tamil Nadu, India.<br/>
          <strong>Email:</strong> robotriqindia@gmail.com | <strong>Phone:</strong> +91 93644 47184
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '32px', color: '#0d9488', fontWeight: '900', letterSpacing: '2px' }}>RECEIPT</div>
        <div style={{ backgroundColor: '#f0fdfa', padding: '15px', borderRadius: '10px', marginTop: '15px', border: '1px solid #ccfbf1', textAlign: 'left', minWidth: '180px' }}>
          <div style={{ fontSize: '12px', color: '#0d9488', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>RECEIPT NO: <span style={{ color: '#1e293b' }}>{row.number}</span></div>
          <div style={{ fontSize: '12px', color: '#0d9488', display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontWeight: 'bold' }}>ORDER ID: <span style={{ color: '#1e293b' }}>{row.orderId || '---'}</span></div>
          <div style={{ fontSize: '12px', color: '#0d9488', display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontWeight: 'bold' }}>RECEIPT DATE: <span style={{ color: '#1e293b' }}>{dateLabel(row.date)}</span></div>
          {(row.nextDueDate || balanceAmount > 0) && (
            <div style={{ fontSize: '12px', color: '#d97706', display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontWeight: 'bold' }}>
              NEXT DUE: <span style={{ color: '#b45309' }}>
                {row.nextDueDate
                  ? dateLabel(row.nextDueDate)
                  : 'Not Scheduled'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>

    <div style={{ borderBottom: '2px solid #0d9488', margin: '25px 0' }}></div>

    <div style={{ marginBottom: '25px' }}>
      <div style={{ fontSize: '14px', fontWeight: '900', color: '#0d9488' }}>RECEIVED FROM:</div>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginTop: '8px' }}>{row.studentName || '---'}</div>
      {row.address && <div style={{ fontSize: '12px', color: '#475569', marginTop: '5px' }}>{row.address}</div>}
    </div>

    <table className="robotriq-receipt-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
      <tbody>
        <tr>
          <td style={{ color: '#0d9488', fontWeight: 'bold', width: '50%' }}>Description / Service</td>
          <td style={{ fontWeight: '600' }}>{row.course || 'Industrial Automation Training'}</td>
        </tr>
        <tr>
          <td style={{ color: '#0d9488', fontWeight: 'bold' }}>Payment Mode</td>
          <td style={{ fontWeight: '600' }}>{row.paymentMode} {row.reference ? `(${row.reference})` : ''}</td>
        </tr>
        <tr>
          <td style={{ color: '#0d9488', fontWeight: 'bold' }}>Total Course Fees</td>
          <td style={{ fontWeight: '700', color: '#0f172a' }}>{money(row.totalFees)}</td>
        </tr>
        <tr>
          <td style={{ color: '#0d9488', fontWeight: 'bold' }}>Previously Paid Amount</td>
          <td style={{ fontWeight: '600', color: '#475569' }}>{money(row.previouslyPaid)}</td>
        </tr>
        <tr style={{ background: '#f0fdf4' }}>
          <td style={{ color: '#16a34a', fontWeight: 'bold' }}>Current Amount Paid (This Receipt)</td>
          <td style={{ fontWeight: '800', color: '#16a34a', fontSize: '15px' }}>{money(row.amount)}</td>
        </tr>
        <tr>
          <td style={{ color: '#0d9488', fontWeight: 'bold' }}>Total Amount Paid So Far</td>
          <td style={{ fontWeight: '800', color: '#0d9488' }}>{money(totalPaid)}</td>
        </tr>
        <tr style={{ background: balanceAmount > 0 ? '#fef2f2' : '#f0fdf4' }}>
          <td style={{ color: balanceAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>Remaining Pending Amount</td>
          <td style={{ fontWeight: '800', color: balanceAmount > 0 ? '#dc2626' : '#16a34a', fontSize: '15px' }}>
            {money(balanceAmount)}
            {balanceAmount === 0 && <span style={{ fontSize: '11px', marginLeft: '6px', color: '#16a34a', fontWeight: 'bold' }}>(Full Fees Paid)</span>}
          </td>
        </tr>
        {(row.nextDueDate || balanceAmount > 0) && (
          <tr style={{ background: balanceAmount > 0 ? '#fffbeb' : '#f8fafc' }}>
            <td style={{ color: balanceAmount > 0 ? '#d97706' : '#64748b', fontWeight: 'bold' }}>Next Due Date</td>
            <td style={{ fontWeight: '800', color: balanceAmount > 0 ? '#b45309' : '#1e293b', textAlign: 'right', fontSize: '13.5px' }}>
              {row.nextDueDate
                ? dateLabel(row.nextDueDate)
                : (balanceAmount > 0 ? 'Not Scheduled' : 'Full Fees Paid (No Due)')}
            </td>
          </tr>
        )}
      </tbody>
    </table>

    <div className="robotriq-receipt-total">
      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>AMOUNT RECEIVED (THIS RECEIPT)</div>
      <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{money(row.amount)}</div>
    </div>

    <div style={{ marginTop: '14px', fontSize: '12px', color: '#475569', fontStyle: 'italic', marginBottom: '25px' }}>
      <strong>Amount in Words:</strong> {amountInWords(row.amount)}
    </div>

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '35px' }}>
      <div style={{ width: '33%' }}></div>
      <div style={{ width: '33%', display: 'flex', justifyContent: 'center' }}><img src={SealImg} alt="Seal" style={{ height: '140px' }} /></div>
      <div style={{ width: '33%', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>for ROBOTRIQ</div>
        <img src={SignPrabha} alt="Signature" style={{ height: '75px', objectFit: 'contain' }} />
        <div style={{ borderTop: '2px solid #0d9488', paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }}>Authorised Signatory</div>
      </div>
    </div>

    <div style={{ textAlign: 'center', marginTop: '35px', fontSize: '11px', color: '#94a3b8', borderTop: '1px dashed #e2e8f0', paddingTop: '15px' }}>
      This is a Computer Generated Payment Receipt
    </div>
    <div className="robotriq-receipt-rule" style={{ marginTop: '20px' }}></div>
  </div>
  );
}

export function robotriqReceiptPdf(row) {
  return renderRobotriqPdf(<ReceiptContent row={row} />, 'portrait', 4);
}
