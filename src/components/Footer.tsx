import Container from "./Container";
import { logo } from "@/assets";
import SocialLink from "./SocialLink";
import Title from "./Title";
import { FaFacebook } from "react-icons/fa";
import { InfoNavigation, navigation } from "@/constants";
import Link from "next/link";
import Image from "next/image";
import { GoDotFill } from "react-icons/go";
import { BsEnvelopeAt } from "react-icons/bs";
import { GrLocation } from "react-icons/gr";

const Footer = () => {
  return (
    <div className="bg-light-bg py-10 lg:py-20">
      <Container className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="flex flex-col items-start gap-y-5">
          <Link href={"/"}>
            <Image 
              src="/kwahudwaso-logo.png" 
              alt="Kwahu Dwaso Logo" 
              width={180} 
              height={40} 
              className="h-10 w-auto object-contain"
            />
          </Link>
          <p>
            Kwahu Dwaso is the premier digital marketplace dedicated to serving Nkawkaw and the entire Kwahu enclave with quality products and reliable delivery.
          </p>
          <SocialLink />
        </div>
        <div>
          <Title>My Account</Title>
          <div className="mt-3 flex flex-col gap-y-2">
            {navigation?.map((item) => (
              <Link
                key={item?.title}
                href={item?.href}
                className="flex items-center gap-x-2 text-gray-700 hover:text-theme-color duration-200 font-medium"
              >
                <GoDotFill size={10} />
                {item?.title}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <Title>Information</Title>
          <div className="mt-3 flex flex-col gap-y-2">
            {InfoNavigation?.map((item) => (
              <Link
                key={item?.title}
                href={item?.href}
                className="flex items-center gap-x-2 text-gray-700 hover:text-theme-color duration-200 font-medium"
              >
                <GoDotFill size={10} />
                {item?.title}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <Title>Talk to Us</Title>
          <div className="mt-3">
            <div>
              <p className="text-sm">Got Questions? Call us</p>
              <Title>(+233 557704585)</Title>
            </div>
            <div className="mt-3">
              <p className="text-base flex items-center gap-x-3 text-gray-600">
                <BsEnvelopeAt /> info@kwahudwaso.com
              </p>
              <p className="text-base flex items-center gap-x-3 text-gray-600">
                <GrLocation /> Nkawkaw, Eastern Region, Ghana
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Footer;
