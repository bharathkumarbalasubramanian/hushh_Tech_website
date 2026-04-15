import { Link } from "react-router-dom";

import HushhLogo from "../images/Hushhogo.png";
import HushhTechHeader from "../hushh-tech-header/HushhTechHeader";
import HushhTechFooter from "../hushh-tech-footer/HushhTechFooter";

const playfair = { fontFamily: "'Playfair Display', serif" };

export default function AuthBootingScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white">
      <HushhTechHeader />

      <main className="px-6 flex-grow max-w-md mx-auto w-full flex flex-col justify-center pb-12">
        <section className="flex justify-center pt-16 pb-8">
          <Link to="/">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1c1c1e] to-[#2c2c2e] flex items-center justify-center overflow-hidden border border-black/5">
              <img
                src={HushhLogo}
                alt="Hushh Logo"
                className="w-14 h-14 object-contain"
              />
            </div>
          </Link>
        </section>

        <section className="pb-8">
          <h1
            className="text-[2.2rem] leading-[1.1] font-normal text-black tracking-tight text-center font-serif"
            style={playfair}
          >
            {title}
          </h1>
          <p className="text-gray-500 text-sm font-light mt-4 text-center leading-relaxed">
            {description}
          </p>
        </section>

        <section className="flex flex-col items-center justify-center gap-4 pb-10">
          <div className="w-9 h-9 border-2 border-hushh-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400 font-medium">
            Preparing secure sign-in
          </p>
        </section>
      </main>

      <HushhTechFooter />
    </div>
  );
}
