import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
      <Helmet>
        <title>Privacy Policy - KKT News</title>
        <meta name="description" content="Privacy Policy for KKT News" />
      </Helmet>

      <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-8 border-b pb-4 border-slate-200">
        Privacy Policy
      </h1>

      <div className="prose prose-slate max-w-none text-slate-700">
        <p className="font-semibold text-lg mb-6">Last updated: {new Date().toLocaleDateString('en-IN')}</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
          <p className="mb-4">
            Welcome to KKT News. We are committed to protecting your personal information and your right to privacy. 
            If you have any questions or concerns about our policy, or our practices with regards to your personal 
            information, please contact us.
          </p>
          <p>
            When you visit our website, and use our services, you trust us with your personal information. We take 
            your privacy very seriously. In this privacy notice, we describe our privacy policy. We seek to explain 
            to you in the clearest way possible what information we collect, how we use it and what rights you have 
            in relation to it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information we collect</h2>
          <p className="mb-4">
            We automatically collect certain information when you visit, use or navigate the website. This information 
            does not reveal your specific identity (like your name or contact information) but may include device and usage 
            information, such as your IP address, browser and device characteristics, operating system, language preferences, 
            referring URLs, device name, country, location, information about how and when you use our website and other 
            technical information.
          </p>
          <p>
            This information is primarily needed to maintain the security and operation of our website, and for our 
            internal analytics and reporting purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">3. How we use your information</h2>
          <p className="mb-4">
            We use personal information collected via our website for a variety of business purposes described below. 
            We process your personal information for these purposes in reliance on our legitimate business interests, 
            in order to enter into or perform a contract with you, with your consent, and/or for compliance with our 
            legal obligations.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To facilitate account creation and logon process.</li>
            <li>To send administrative information to you.</li>
            <li>To fulfill and manage your requests.</li>
            <li>To deliver targeted news and content to you.</li>
            <li>To request feedback and to contact you about your use of our website.</li>
            <li>To protect our website and operations.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Will your information be shared with anyone?</h2>
          <p className="mb-4">
            We only share information with your consent, to comply with laws, to provide you with services, to protect 
            your rights, or to fulfill business obligations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Do we use cookies and other tracking technologies?</h2>
          <p className="mb-4">
            We may use cookies and similar tracking technologies (like web beacons and pixels) to access or store information. 
            Specific information about how we use such technologies and how you can refuse certain cookies is set out in our 
            Cookie Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Is your information transferred internationally?</h2>
          <p className="mb-4">
            Our servers are located in secure data centers. If you are accessing our website from outside our primary 
            operations region, please be aware that your information may be transferred to, stored, and processed by us 
            in our facilities and by those third parties with whom we may share your personal information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">7. How long do we keep your information?</h2>
          <p className="mb-4">
            We will only keep your personal information for as long as it is necessary for the purposes set out in this 
            privacy policy, unless a longer retention period is required or permitted by law (such as tax, accounting or 
            other legal requirements).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">8. How do we keep your information safe?</h2>
          <p className="mb-4">
            We have implemented appropriate technical and organizational security measures designed to protect the security 
            of any personal information we process. However, please also remember that we cannot guarantee that the internet 
            itself is 100% secure. Although we will do our best to protect your personal information, transmission of personal 
            information to and from our website is at your own risk.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">9. What are your privacy rights?</h2>
          <p className="mb-4">
            In some regions, such as the European Economic Area, you have rights that allow you greater access to and control 
            over your personal information. You may review, change, or terminate your account at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact Us</h2>
          <p className="mb-4">
            If you have questions or comments about this policy, you may email us at our designated contact email or by post 
            to the corporate address of KKT News.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
