import { renderRobotriqPdf } from './robotriqPdf';
import LogoImg from '../assets/robotriq-receipt-logo.png';
import SignPrabha from '../assets/robotriq-receipt-sign.png';
import SealImg from '../assets/robotriq-receipt-seal.png';
import SignPrakash from '../assets/robotriq-certificate-sign.png';
import BadgeImg from '../assets/robotriq-certificate-badge.png';

const CertificateContent = ({ data }) => {
  return (
    <div style={{
      width: '1122px', height: '793px', position: 'relative',
      boxSizing: 'border-box', fontFamily: "'Inter', 'Helvetica Neue', 'Arial', sans-serif", lineHeight: 'normal',
      overflow: 'hidden', background: '#ffffff',
      border: '8px solid #f1f5f9'
    }}>

      <img src={LogoImg} alt="Logo" style={{ position: 'absolute', top: '70px', left: '80px', height: '45px', zIndex: 2 }} crossOrigin="anonymous" />

      <img src={BadgeImg} alt="Badge" style={{ position: 'absolute', top: '0', right: '80px', width: '150px', zIndex: 2 }} crossOrigin="anonymous" />

      <div style={{
        position: 'absolute', top: '250px', right: '80px', width: '150px', textAlign: 'center',
        fontSize: '12px', color: '#475569', fontFamily: "'Inter', sans-serif", zIndex: 2, lineHeight: '1.6'
      }}>
        <div style={{ fontWeight: '600', color: '#1e293b' }}>Certificate UID : {data.uid || '---'}</div>
        <div style={{ marginTop: '5px', fontWeight: '600', color: '#1e293b' }}>Issue Date : {data.date ? data.date.split('-').reverse().join('-') : '---'}</div>
      </div>

      <div style={{ position: 'absolute', top: '160px', left: '80px', zIndex: 2 }}>
        <h1 style={{ fontSize: '64px', fontWeight: '500', color: '#0f172a', margin: '0', lineHeight: '1.1', letterSpacing: '1px' }}>CERTIFICATE</h1>
        <h2 style={{ fontSize: '36px', fontWeight: '400', color: '#0f172a', margin: '5px 0 0 0', letterSpacing: '2px' }}>OF ACHIEVEMENT</h2>
      </div>

      <div style={{ position: 'absolute', top: '300px', left: '80px', fontSize: '22px', color: '#475569', fontStyle: 'italic', zIndex: 2 }}>
        This certificate is proudly presented to
      </div>

      <div style={{
        position: 'absolute', top: '350px', left: '80px',
        fontSize: '52px', fontWeight: '900', color: '#0f172a',
        textTransform: 'uppercase', letterSpacing: '1px', zIndex: 2
      }}>
        {data.studentName || 'STUDENT NAME'}
      </div>

      <div style={{ position: 'absolute', top: '425px', left: '80px', width: '500px', height: '3px', background: '#0f172a', zIndex: 2 }}></div>

      <div style={{
        position: 'absolute', top: '455px', left: '80px', width: '750px',
        fontSize: '18px', color: '#475569', lineHeight: '1.6', zIndex: 2
      }}>
        Completed a <strong style={{ color: '#0f172a', fontWeight: '700' }}>{data.courseName || 'COURSE NAME'}</strong> training that combines theory and real-time application to prepare you for roles in automation and control systems.
      </div>

      <div style={{ position: 'absolute', top: '535px', left: '80px', fontSize: '16px', color: '#475569', textTransform: 'uppercase', zIndex: 2 }}>
        BRAND : <span style={{ color: '#0f172a', fontWeight: '700' }}>{data.brand || '---'}</span>
      </div>
      <div style={{ position: 'absolute', top: '560px', left: '80px', fontSize: '16px', color: '#475569', textTransform: 'uppercase', zIndex: 2 }}>
        PRODUCTS : <span style={{ color: '#0f172a', fontWeight: '700' }}>{data.products || '---'}</span>
      </div>

      <img src={SealImg} alt="Seal" style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', width: '130px', height: '130px', objectFit: 'contain', zIndex: 2 }} crossOrigin="anonymous" />

      <div style={{ position: 'absolute', bottom: '50px', left: '80px', width: '220px', zIndex: 2 }}>
        <img src={SignPrakash} alt="Sign" style={{ height: '60px', objectFit: 'contain', marginBottom: '5px' }} crossOrigin="anonymous" />
        <div style={{ width: '220px', height: '2px', background: '#0f172a', margin: '5px 0' }}></div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Prakash</div>
        <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginTop: '2px' }}>AUTOMATION HEAD</div>
      </div>

      <div style={{ position: 'absolute', bottom: '50px', right: '80px', width: '220px', zIndex: 2 }}>
        <img src={SignPrabha} alt="Sign" style={{ height: '60px', objectFit: 'contain', marginBottom: '5px' }} crossOrigin="anonymous" />
        <div style={{ width: '220px', height: '2px', background: '#0f172a', margin: '5px 0' }}></div>
        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Prabhakaran</div>
        <div style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginTop: '2px' }}>TECHNICAL DIRECTOR</div>
      </div>

    </div>
  );
};

export function robotriqCertificatePdf(record) {
  return renderRobotriqPdf(<CertificateContent data={record} />, 'landscape', 3);
}
