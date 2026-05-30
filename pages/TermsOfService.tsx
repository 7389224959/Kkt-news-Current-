import React from 'react';
import { Helmet } from 'react-helmet-async';

const TermsOfService: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
      <Helmet>
        <title>Terms of Service - KKT News</title>
        <meta name="description" content="Terms of Service for KKT News" />
      </Helmet>

      <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-8 border-b pb-4 border-slate-200">
        Terms of Service
      </h1>

      <div className="prose prose-slate max-w-none text-slate-700">
        <p className="font-semibold text-lg mb-6">Last updated: {new Date().toLocaleDateString('en-IN')}</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using KKT News, you accept and agree to be bound by the terms and provision of this agreement. 
            In addition, when using this website's particular services, you shall be subject to any posted guidelines or rules 
            applicable to such services.
          </p>
          <p>
            Any participation in this service will constitute acceptance of this agreement. If you do not agree to abide by the above, 
            please do not use this service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Accuracy of Information</h2>
          <p className="mb-4">
            The news, information, and content provided on KKT News are for informational purposes only. We strive to provide 
            accurate and up-to-date information, but we make no representations or warranties of any kind, express or implied, 
            about the completeness, accuracy, reliability, suitability or availability of the information, products, services, 
            or related graphics contained on the website for any purpose. 
          </p>
          <p>
            Any reliance you place on such information is therefore strictly at your own risk.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Conduct</h2>
          <p className="mb-4">
            You agree to use KKT News only for lawful purposes and in a way that does not infringe the rights of, restrict or 
            inhibit anyone else's use and enjoyment of the website. Prohibited behavior includes harassing or causing distress 
            or inconvenience to any person, transmitting obscene or offensive content, or disrupting the normal flow of dialogue 
            within our website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Intellectual Property</h2>
          <p className="mb-4">
            The site and its original content, features, and functionality are owned by KKT News and are protected by 
            international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws. 
            You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, 
            download, store, or transmit any of the material on our website without our prior written consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Links to Third-Party Sites</h2>
          <p className="mb-4">
            Through this website, you may be able to link to other websites which are not under the control of KKT News. 
            We have no control over the nature, content, and availability of those sites. The inclusion of any links does not 
            necessarily imply a recommendation or endorse the views expressed within them.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Limitation of Liability</h2>
          <p className="mb-4">
            In no event will KKT News, its affiliates, employees, agents, officers, or directors be liable for damages of any 
            kind, under any legal theory, arising out of or in connection with your use, or inability to use, the website, 
            any websites linked to it, any content on the website or such other websites, including any direct, indirect, 
            special, incidental, consequential, or punitive damages.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms from time to time at our sole discretion. Therefore, you should review 
            these pages periodically. Your continued use of the Website or our service after any such change constitutes your 
            acceptance of the new Terms of Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Governing Law</h2>
          <p className="mb-4">
            These terms and conditions are governed by and construed in accordance with the laws of India, and you irrevocably 
            submit to the exclusive jurisdiction of the courts in that State or location.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
