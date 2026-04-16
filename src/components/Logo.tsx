import Link from "next/link";
import Image from "next/image";
import React from "react";

const Logo = () => {
  return (
    <Link href={"/"} className="flex items-center group">
      <Image 
        src="/logo.png" 
        alt="Kwahu Dwaso Logo" 
        width={240} 
        height={56} 
        className="h-12 md:h-14 w-auto object-contain transition-opacity duration-200 group-hover:opacity-90" 
        priority
      />
    </Link>
  );
};

export default Logo;
