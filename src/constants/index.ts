import { bannerImageOne } from "@/assets";

export const navigation = [
  { title: "Home", href: "/" },
  { title: "Products", href: "/products" },
  { title: "Categories", href: "/categories" },
  { title: "Offers", href: "/offers" },
];
export const InfoNavigation = [
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
  { title: "Inquiry", href: "/inquiry" },
  { title: "FAQs", href: "/faqs" },
];

export const banner = {
  _id: 1001,
  priceText: "The best prices in Kwahu",
  title: "Quality Products, Swift Delivery to Your Doorstep",
  textOne: "Exclusive offer",
  offerPrice: "-10%",
  textTwo: "off this week",
  buttonLink: "/products",
  image: { src: bannerImageOne },
};
