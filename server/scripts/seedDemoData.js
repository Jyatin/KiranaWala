/**
 * KiranaWala — Idempotent Demo Data Seeder
 * 
 * Populates 20 distinct Bengaluru Stores with 10+ real grocery products each (200+ products total).
 * All stores and products contain valid Unsplash CDN images compatible with Next.js image config.
 * 
 * Usage: npm run seed OR node server/scripts/seedDemoData.js
 */

const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const User = require("../models/user");
const Store = require("../models/store");
const Product = require("../models/product");
const Order = require("../models/order");
const Coupon = require("../models/coupon");
const Delivery = require("../models/delivery");

// Stable Unsplash CDN image URLs for grocery products
const PRODUCT_IMAGES = {
  // Fruits
  apples: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80",
  bananas: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
  oranges: "https://images.unsplash.com/photo-1547514701-42782101795e?w=600&auto=format&fit=crop&q=80",
  mangoes: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80",
  grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600&auto=format&fit=crop&q=80",
  pomegranate: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",

  // Vegetables
  tomatoes: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
  potatoes: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80",
  onions: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
  carrots: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&auto=format&fit=crop&q=80",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
  chillies: "https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?w=600&auto=format&fit=crop&q=80",

  // Dairy & Eggs
  milk: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80",
  curd: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
  paneer: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80",
  cheese: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop&q=80",
  eggs: "https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?w=600&auto=format&fit=crop&q=80",

  // Staples & Atta
  atta: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
  dal: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
  moong_dal: "https://images.unsplash.com/photo-1585994191611-72ec0b4e2874?w=600&auto=format&fit=crop&q=80",
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
  salt: "https://images.unsplash.com/photo-1518110168401-f2877ee2c6ad?w=600&auto=format&fit=crop&q=80",
  sugar: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80",
  poha: "https://images.unsplash.com/photo-1613769049987-b31b641f25b1?w=600&auto=format&fit=crop&q=80",

  // Spices & Oils
  turmeric: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
  chilli_powder: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80",
  garam_masala: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80",
  mustard_oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",

  // Snacks & Beverages
  maggi: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600&auto=format&fit=crop&q=80",
  chips: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
  kurkure: "https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=600&auto=format&fit=crop&q=80",
  cookies: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80",
  biscuits: "https://images.unsplash.com/photo-1548365328-8c6db3220e4c?w=600&auto=format&fit=crop&q=80",
  peanuts: "https://images.unsplash.com/photo-1567892568620-33230b00192d?w=600&auto=format&fit=crop&q=80",

  // Beverages
  tea: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80",
  coffee: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
  juice: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80",
  coca_cola: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
  sprite: "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&auto=format&fit=crop&q=80",

  // Household & Personal Care
  detergent: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=600&auto=format&fit=crop&q=80",
  soap: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&auto=format&fit=crop&q=80",
  shampoo: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80",
  toothpaste: "https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=600&auto=format&fit=crop&q=80",
};

// 20 Distinct Bengaluru Stores with unique names, descriptions, categories, coordinates, and images
const STORES_DATA = [
  {
    ownerEmail: "owner_gupta_hsr@kiranawala.demo",
    ownerUsername: "gupta_hsr",
    ownerName: "Rajesh Gupta",
    storeName: "Gupta Kirana & General Store",
    category: "Kirana & General Store",
    description: "Your trusted neighborhood Kirana store in HSR Layout Sector 1. Fresh daily staples, dairy, and household goods.",
    location: { type: "Point", coordinates: [77.6389, 12.9121] }, // HSR Layout
    image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_sharma_indiranagar@kiranawala.demo",
    ownerUsername: "sharma_indiranagar",
    ownerName: "Suresh Sharma",
    storeName: "Sharma Super Mart",
    category: "Supermarket",
    description: "Premium daily provisions, fresh dairy, packaged foods, and spices on 100 Feet Road, Indiranagar.",
    location: { type: "Point", coordinates: [77.6412, 12.9784] }, // Indiranagar
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_lakshmi_koramangala@kiranawala.demo",
    ownerUsername: "lakshmi_koramangala",
    ownerName: "Venkat Lakshmi",
    storeName: "Lakshmi Provision Store",
    category: "Provisions",
    description: "Quality grains, pulses, oils, and organic spices. Serving Koramangala 4th Block since 1998.",
    location: { type: "Point", coordinates: [77.6245, 12.9352] }, // Koramangala
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_patel_whitefield@kiranawala.demo",
    ownerUsername: "patel_whitefield",
    ownerName: "Mahesh Patel",
    storeName: "Patel Traders & Provisions",
    category: "Kirana & General Store",
    description: "Fast doorstep fulfillment for tech park residents in Whitefield. Wholesale prices on monthly grocery bundles.",
    location: { type: "Point", coordinates: [77.7499, 12.9698] }, // Whitefield
    image: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_ganesh_jayanagar@kiranawala.demo",
    ownerUsername: "ganesh_jayanagar",
    ownerName: "Ramesh Ganesh",
    storeName: "Sri Ganesh Kirana Store",
    category: "Daily Needs",
    description: "Authentic South Indian staples, fresh idli batter, ghee, and traditional spices in Jayanagar 3rd Block.",
    location: { type: "Point", coordinates: [77.5828, 12.925] }, // Jayanagar
    image: "https://images.unsplash.com/photo-1601598851547-4302969d0614?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_fresh_bellandur@kiranawala.demo",
    ownerUsername: "fresh_bellandur",
    ownerName: "Anil Kumar",
    storeName: "Fresh Basket Market",
    category: "Supermarket",
    description: "Farm fresh fruits, organic vegetables, and gourmet pantry staples in Green Glen Layout, Bellandur.",
    location: { type: "Point", coordinates: [77.6725, 12.9281] }, // Bellandur
    image: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_greenleaf_sarjapur@kiranawala.demo",
    ownerUsername: "greenleaf_sarjapur",
    ownerName: "Praveen Rao",
    storeName: "Green Leaf Grocers",
    category: "Fresh Produce",
    description: "Direct farm-to-table vegetables, fresh greens, exotic fruits, and cold-pressed cooking oils on Sarjapur Road.",
    location: { type: "Point", coordinates: [77.6842, 12.9150] }, // Sarjapur Road
    image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_dailyneeds_btm@kiranawala.demo",
    ownerUsername: "dailyneeds_btm",
    ownerName: "Karthik Hegde",
    storeName: "Daily Needs Mart",
    category: "Daily Needs",
    description: "24/7 express daily essentials, snacks, beverages, and personal care products in BTM Layout 2nd Stage.",
    location: { type: "Point", coordinates: [77.6101, 12.9166] }, // BTM Layout
    image: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_freshhub_malleswaram@kiranawala.demo",
    ownerUsername: "freshhub_malleswaram",
    ownerName: "Subramaniam Iyer",
    storeName: "Bengaluru Fresh Hub",
    category: "Supermarket",
    description: "Heritage Malleswaram market featuring unpolished pulses, pure cow ghee, filter coffee, and traditional grains.",
    location: { type: "Point", coordinates: [77.5702, 13.0031] }, // Malleswaram
    image: "https://images.unsplash.com/photo-1543168256-418811576931?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_pantry_jpnagar@kiranawala.demo",
    ownerUsername: "pantry_jpnagar",
    ownerName: "Dinesh Reddy",
    storeName: "Neighborhood Pantry",
    category: "Kirana & General Store",
    description: "Your family's daily shopping destination in JP Nagar 6th Phase. Organic millets, dry fruits, and household supplies.",
    location: { type: "Point", coordinates: [77.5866, 12.9063] }, // JP Nagar
    image: "https://images.unsplash.com/photo-1579113800032-c38bd7729878?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_hsr_sec3@kiranawala.demo",
    ownerUsername: "hsr_sec3",
    ownerName: "Vikramjit Singh",
    storeName: "HSR Daily Mart",
    category: "Daily Needs",
    description: "Express grocery delivery across HSR Sector 3. Fresh dairy, packaged snacks, and instant cooking mixes.",
    location: { type: "Point", coordinates: [77.6441, 12.9102] }, // HSR Sector 3
    image: "https://images.unsplash.com/photo-1580913428735-bd3c269d6a82?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_bellandur_fresh@kiranawala.demo",
    ownerUsername: "bellandur_fresh",
    ownerName: "Sanjay Mehta",
    storeName: "Bellandur Fresh Mart",
    category: "Provisions",
    description: "Convenient grocery shopping near EcoSpace Outer Ring Road. Premium basmati rice, dal, and cooking oils.",
    location: { type: "Point", coordinates: [77.6811, 12.9244] }, // Bellandur ORR
    image: "https://images.unsplash.com/photo-1574634534894-89d7576c8259?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_kora_5th@kiranawala.demo",
    ownerUsername: "kora_5th",
    ownerName: "Arjun Nair",
    storeName: "Koramangala Grocers",
    category: "Supermarket",
    description: "Urban supermarket in Koramangala 5th Block. Specialty teas, gourmet snacks, and organic dairy products.",
    location: { type: "Point", coordinates: [77.6200, 12.9340] }, // Koramangala 5th Block
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_balaji_rajajinagar@kiranawala.demo",
    ownerUsername: "balaji_rajajinagar",
    ownerName: "Balaji Prasad",
    storeName: "Sri Balaji Super Market",
    category: "Kirana & General Store",
    description: "Trusted Rajajinagar 1st Block neighborhood bazaar. Quality wheat flour, pulses, spices, and cleaning supplies.",
    location: { type: "Point", coordinates: [77.5550, 12.9900] }, // Rajajinagar
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_venkateshwara_vijn@kiranawala.demo",
    ownerUsername: "venkateshwara_vijn",
    ownerName: "Muralidhar Rao",
    storeName: "Venkateshwara Kirana",
    category: "Provisions",
    description: "Fresh daily provisions and traditional South Indian cooking ingredients in Vijayanagar.",
    location: { type: "Point", coordinates: [77.5350, 12.9700] }, // Vijayanagar
    image: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_nandi_ecity@kiranawala.demo",
    ownerUsername: "nandi_ecity",
    ownerName: "Narasimha Murthy",
    storeName: "Nandi Fresh & Organic",
    category: "Fresh Produce",
    description: "Organic vegetables, cold-pressed oils, and farm fresh milk delivered across Electronic City Phase 1.",
    location: { type: "Point", coordinates: [77.6650, 12.8450] }, // Electronic City
    image: "https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_mahaveer_chickpet@kiranawala.demo",
    ownerUsername: "mahaveer_chickpet",
    ownerName: "Deepak Jain",
    storeName: "Mahaveer Provision Store",
    category: "Daily Needs",
    description: "Wholesale prices on dry fruits, spices, grains, and monthly grocery bundles in Chickpet.",
    location: { type: "Point", coordinates: [77.5770, 12.9680] }, // Chickpet
    image: "https://images.unsplash.com/photo-1601598851547-4302969d0614?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_basaveshwara_bgudi@kiranawala.demo",
    ownerUsername: "basaveshwara_bgudi",
    ownerName: "Girish Gowda",
    storeName: "Basaveshwara Daily Needs",
    category: "Kirana & General Store",
    description: "Serving Basavanagudi households with high quality daily staples, dairy, and household essentials.",
    location: { type: "Point", coordinates: [77.5730, 12.9410] }, // Basavanagudi
    image: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_marathahalli_bazaar@kiranawala.demo",
    ownerUsername: "marathahalli_bazaar",
    ownerName: "Imran Khan",
    storeName: "Marathahalli Super Bazaar",
    category: "Supermarket",
    description: "24/7 active neighborhood supermarket near Marathahalli Bridge. Wide assortment of fresh & packaged foods.",
    location: { type: "Point", coordinates: [77.6974, 12.9591] }, // Marathahalli
    image: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=800&auto=format&fit=crop&q=80",
  },
  {
    ownerEmail: "owner_banashankari_kirana@kiranawala.demo",
    ownerUsername: "banashankari_kirana",
    ownerName: "Sundar Rajan",
    storeName: "Banashankari Heritage Kirana",
    category: "Provisions",
    description: "Traditional Kirana store in Banashankari 2nd Stage. Heritage rice varieties, pure ghee, and fresh milk.",
    location: { type: "Point", coordinates: [77.5680, 12.9260] }, // Banashankari
    image: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&auto=format&fit=crop&q=80",
  },
];

// Product master list pool (11 items per store = 220 total products across 20 stores)
function getProductsForStoreIndex(storeIndex) {
  const baseCatalog = [
    // 1. Fruits & Fresh Produce
    { name: "Fresh Shimla Apples 1kg", price: 180, description: "Crisp and juicy sweet Shimla red apples.", category: "Fruits", brand: "Farm Fresh", unit: "1 kg", image: PRODUCT_IMAGES.apples, stock: 35 },
    { name: "Robusta Bananas 1kg", price: 45, description: "Naturally ripened sweet yellow Robusta bananas.", category: "Fruits", brand: "Farm Fresh", unit: "1 kg", image: PRODUCT_IMAGES.bananas, stock: 50 },
    { name: "Nagpur Oranges 1kg", price: 90, description: "Juicy citrus oranges packed with Vitamin C.", category: "Fruits", brand: "Farm Fresh", unit: "1 kg", image: PRODUCT_IMAGES.oranges, stock: 28 },
    { name: "Fresh Alphonso Mangoes 1kg", price: 320, description: "Premium GI-tagged Ratnagiri Alphonso mangoes.", category: "Fruits", brand: "Royal Produce", unit: "1 kg", image: PRODUCT_IMAGES.mangoes, stock: 15 },
    { name: "Seedless Black Grapes 500g", price: 85, description: "Sweet seedless dark grapes rich in antioxidants.", category: "Fruits", brand: "Farm Fresh", unit: "500 g", image: PRODUCT_IMAGES.grapes, stock: 22 },

    // 2. Vegetables
    { name: "Fresh Hybrid Tomatoes 1kg", price: 38, description: "Farm fresh red ripe tomatoes for curry base.", category: "Vegetables", brand: "Local APMC", unit: "1 kg", image: PRODUCT_IMAGES.tomatoes, stock: 60 },
    { name: "Nashik Red Onions 1kg", price: 32, description: "Quality firm red onions, essential cooking staple.", category: "Vegetables", brand: "Local APMC", unit: "1 kg", image: PRODUCT_IMAGES.onions, stock: 75 },
    { name: "Fresh Potatoes 1kg", price: 28, description: "Clean skin baking and frying potatoes.", category: "Vegetables", brand: "Local APMC", unit: "1 kg", image: PRODUCT_IMAGES.potatoes, stock: 80 },
    { name: "Fresh Ooty Carrots 500g", price: 42, description: "Crunchy sweet red Ooty carrots.", category: "Vegetables", brand: "Local APMC", unit: "500 g", image: PRODUCT_IMAGES.carrots, stock: 40 },
    { name: "Fresh Organic Spinach (Palak) 250g", price: 22, description: "Washed and crisp leafy green spinach bunch.", category: "Fresh Produce", brand: "Organic Green", unit: "250 g", image: PRODUCT_IMAGES.spinach, stock: 30 },
    { name: "Fresh Green Chillies 250g", price: 18, description: "Spicy fresh green chillies for cooking seasoning.", category: "Vegetables", brand: "Local APMC", unit: "250 g", image: PRODUCT_IMAGES.chillies, stock: 45 },

    // 3. Dairy & Eggs
    { name: "Amul Taaza Toned Milk 500ml", price: 27, description: "Fresh pasteurized toned milk, rich in calcium.", category: "Dairy & Eggs", brand: "Amul", unit: "500 ml", image: PRODUCT_IMAGES.milk, stock: 40 },
    { name: "Amul Butter Pasteurized 100g", price: 56, description: "Classic salted Indian butter for cooking and toast.", category: "Dairy & Eggs", brand: "Amul", unit: "100 g", image: PRODUCT_IMAGES.butter, stock: 25 },
    { name: "Amul Fresh Paneer 200g", price: 95, description: "Soft creamy cottage cheese for paneer butter masala.", category: "Dairy & Eggs", brand: "Amul", unit: "200 g", image: PRODUCT_IMAGES.paneer, stock: 18 },
    { name: "Nandini Fresh Curd 500g", price: 32, description: "Thick creamy probiotic dahi for everyday meals.", category: "Dairy & Eggs", brand: "Nandini", unit: "500 g", image: PRODUCT_IMAGES.curd, stock: 30 },
    { name: "Amul Processed Cheese Blocks 200g", price: 135, description: "Rich cheddar cheese blocks for sandwiches and pasta.", category: "Dairy & Eggs", brand: "Amul", unit: "200 g", image: PRODUCT_IMAGES.cheese, stock: 20 },
    { name: "Farm Fresh White Eggs (Pack of 6)", price: 48, description: "High protein farm fresh white eggs.", category: "Dairy & Eggs", brand: "Eggoz", unit: "6 eggs", image: PRODUCT_IMAGES.eggs, stock: 50 },

    // 4. Atta & Grains / Staples
    { name: "Aashirvaad Sharbati Whole Wheat Atta 5kg", price: 245, description: "100% pure MP Sharbati wheat flour for soft rotis.", category: "Atta & Grains", brand: "Aashirvaad", unit: "5 kg", image: PRODUCT_IMAGES.atta, stock: 30 },
    { name: "India Gate Basmati Rice Feast Rozzana 1kg", price: 115, description: "Long grain aromatic basmati rice for daily meals.", category: "Atta & Grains", brand: "India Gate", unit: "1 kg", image: PRODUCT_IMAGES.rice, stock: 25 },
    { name: "Tata Salt Vacuum Evaporated 1kg", price: 28, description: "Iodized salt enriched with essential micronutrients.", category: "Atta & Grains", brand: "Tata", unit: "1 kg", image: PRODUCT_IMAGES.salt, stock: 90 },
    { name: "Superfine White Sugar 1kg", price: 48, description: "Refined sparkling white sugar crystals.", category: "Atta & Grains", brand: "KiranaWala Select", unit: "1 kg", image: PRODUCT_IMAGES.sugar, stock: 65 },
    { name: "Thick Poha / Flattened Rice 500g", price: 35, description: "Clean pressed rice flakes for quick breakfast poha.", category: "Breakfast", brand: "Local Select", unit: "500 g", image: PRODUCT_IMAGES.poha, stock: 40 },

    // 5. Pulses & Lentils
    { name: "Unpolished Toor Dal / Arhar Dal 1kg", price: 165, description: "High protein unpolished split pigeon peas for dal tadka.", category: "Pulses & Lentils", brand: "Tata Sampann", unit: "1 kg", image: PRODUCT_IMAGES.dal, stock: 35 },
    { name: "Yellow Moong Dal Unpolished 1kg", price: 145, description: "Easy-to-digest yellow split mung dal.", category: "Pulses & Lentils", brand: "Tata Sampann", unit: "1 kg", image: PRODUCT_IMAGES.moong_dal, stock: 28 },

    // 6. Spices & Oils
    { name: "Fortune Sunlite Sunflower Oil 1L", price: 145, description: "Light refined sunflower oil rich in Vitamin E.", category: "Spices", brand: "Fortune", unit: "1 L", image: PRODUCT_IMAGES.oil, stock: 30 },
    { name: "Kachi Ghani Mustard Oil 1L", price: 160, description: "Cold-pressed pungent mustard oil for traditional cooking.", category: "Spices", brand: "Fortune", unit: "1 L", image: PRODUCT_IMAGES.mustard_oil, stock: 20 },
    { name: "MDH Turmeric Powder (Haldi) 100g", price: 38, description: "Pure ground turmeric root powder for vibrant color.", category: "Spices", brand: "MDH", unit: "100 g", image: PRODUCT_IMAGES.turmeric, stock: 50 },
    { name: "Everest Kashmiri Red Chilli Powder 100g", price: 52, description: "Rich red color chilli powder with mild pungency.", category: "Spices", brand: "Everest", unit: "100 g", image: PRODUCT_IMAGES.chilli_powder, stock: 45 },
    { name: "Everest Royal Garam Masala 100g", price: 72, description: "Aromatic blend of 13 spices for authentic curry flavor.", category: "Spices", brand: "Everest", unit: "100 g", image: PRODUCT_IMAGES.garam_masala, stock: 40 },

    // 7. Snacks
    { name: "Maggi 2-Minute Masala Noodles 280g", price: 56, description: "Pack of 4 instant masala noodles with signature spice mix.", category: "Snacks", brand: "Nestle Maggi", unit: "280 g", image: PRODUCT_IMAGES.maggi, stock: 60 },
    { name: "Lays Classic Salted Potato Chips 50g", price: 20, description: "Crispy salted potato chips snack.", category: "Snacks", brand: "Lays", unit: "50 g", image: PRODUCT_IMAGES.chips, stock: 80 },
    { name: "Kurkure Masala Munch 85g", price: 20, description: "Spicy crunchy corn puff snack with Indian flavors.", category: "Snacks", brand: "Kurkure", unit: "85 g", image: PRODUCT_IMAGES.kurkure, stock: 70 },
    { name: "Britannia Good Day Cashew Cookies 200g", price: 40, description: "Butter cookies packed with rich cashew nuts.", category: "Snacks", brand: "Britannia", unit: "200 g", image: PRODUCT_IMAGES.cookies, stock: 50 },
    { name: "Parle-G Gold Glucose Biscuits 1kg", price: 80, description: "Iconic energy rich glucose biscuits for tea time.", category: "Snacks", brand: "Parle", unit: "1 kg", image: PRODUCT_IMAGES.biscuits, stock: 45 },
    { name: "Salted Roasted Peanuts 200g", price: 45, description: "Crunchy roasted peanuts with light sea salt.", category: "Snacks", brand: "Haldiram", unit: "200 g", image: PRODUCT_IMAGES.peanuts, stock: 35 },

    // 8. Beverages
    { name: "Tata Tea Gold Leaf Tea 500g", price: 310, description: "Rich blend of Assam tea leaves with long leaves.", category: "Beverages", brand: "Tata Tea", unit: "500 g", image: PRODUCT_IMAGES.tea, stock: 25 },
    { name: "Nescafé Classic Instant Coffee 50g", price: 175, description: "100% pure instant coffee powder for rich aroma.", category: "Beverages", brand: "Nescafé", unit: "50 g", image: PRODUCT_IMAGES.coffee, stock: 30 },
    { name: "Real Mixed Fruit Juice 1L", price: 110, description: "Refreshing fruit juice blend packed with natural vitamins.", category: "Beverages", brand: "Real", unit: "1 L", image: PRODUCT_IMAGES.juice, stock: 25 },
    { name: "Coca-Cola Original Taste 750ml", price: 40, description: "Chilled sparkling carbonated cola soft drink.", category: "Beverages", brand: "Coca-Cola", unit: "750 ml", image: PRODUCT_IMAGES.coca_cola, stock: 50 },
    { name: "Sprite Refreshing Lemon-Lime 750ml", price: 40, description: "Clear crisp lemon-lime sparkling drink.", category: "Beverages", brand: "Sprite", unit: "750 ml", image: PRODUCT_IMAGES.sprite, stock: 50 },

    // 9. Household & Personal Care
    { name: "Surf Excel Easy Wash Powder 1kg", price: 140, description: "Superior stain removal washing powder.", category: "Household", brand: "Surf Excel", unit: "1 kg", image: PRODUCT_IMAGES.detergent, stock: 30 },
    { name: "Dettol Original Bathing Soap 125g (Pack of 3)", price: 135, description: "Germ protection bathing soap with pine fragrance.", category: "Personal Care", brand: "Dettol", unit: "3x125 g", image: PRODUCT_IMAGES.soap, stock: 40 },
    { name: "Head & Shoulders Anti-Dandruff Shampoo 180ml", price: 165, description: "Smooth and silky anti-dandruff hair shampoo.", category: "Personal Care", brand: "Head & Shoulders", unit: "180 ml", image: PRODUCT_IMAGES.shampoo, stock: 25 },
    { name: "Colgate Strong Teeth Toothpaste 200g", price: 115, description: "Calcium boost toothpaste for strong white teeth.", category: "Personal Care", brand: "Colgate", unit: "200 g", image: PRODUCT_IMAGES.toothpaste, stock: 45 },
  ];

  // Rotate items based on store index so every store gets a unique inventory mix of 11 items
  const count = baseCatalog.length;
  const items = [];
  for (let i = 0; i < 11; i++) {
    const idx = (storeIndex * 7 + i * 3) % count;
    items.push({ ...baseCatalog[idx] });
  }
  return items;
}

// ---------------------------------------------------------------------------
// DB Connection Helper
// ---------------------------------------------------------------------------

async function connectMongo() {
  const primaryUri = process.env.MONGO_URI;
  const localUri = "mongodb://127.0.0.1:27017/kiranawala";

  if (primaryUri) {
    try {
      console.log("Connecting to MONGO_URI...");
      await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 4000 });
      console.log("Connected to primary MongoDB cluster successfully.");
      return;
    } catch (err) {
      console.warn(`MONGO_URI connection failed (${err.message}). Falling back to local MongoDB...`);
    }
  }

  try {
    console.log(`Connecting to local MongoDB: ${localUri}`);
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 4000 });
    console.log("Connected to local MongoDB successfully.");
  } catch (err) {
    console.error("Local MongoDB connection failed:", err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Main Idempotent Seed Function
// ---------------------------------------------------------------------------

async function seedData(options = {}) {
  const closeConnection = options.closeConnection !== false;
  try {
    // Only connect if not already connected (when called from devServer, connection is already open)
    if (mongoose.connection.readyState === 0) {
      await connectMongo();
    }

    console.log("\n==============================================");
    console.log("IDEMPOTENT CATALOG SEEDING (20 STORES, 200+ PRODUCTS)");
    console.log("==============================================\n");

    let storesCreated = 0;
    let storesUpdated = 0;
    let productsCreated = 0;
    let productsUpdated = 0;

    const demoPassword = "Password123!";

    // Iterate through all 20 stores
    for (let sIdx = 0; sIdx < STORES_DATA.length; sIdx++) {
      const storeData = STORES_DATA[sIdx];

      // 1. Ensure Store Owner user exists
      let owner = await User.findOne({ email: storeData.ownerEmail });
      if (!owner) {
        owner = new User({
          username: storeData.ownerUsername,
          email: storeData.ownerEmail,
          password: demoPassword,
          role: "store-owner",
        });
        await owner.save();
      }

      // 2. Ensure Store exists and has image
      let store = await Store.findOne({ owner: owner._id });
      if (!store) {
        store = new Store({
          name: storeData.storeName,
          category: storeData.category,
          description: storeData.description,
          owner: owner._id,
          location: storeData.location,
          image: storeData.image,
          isOpen: true,
          products: [],
        });
        await store.save();
        storesCreated++;
      } else {
        store.name = storeData.storeName;
        store.category = storeData.category;
        store.description = storeData.description;
        store.location = storeData.location;
        store.image = storeData.image;
        store.isOpen = true;
        await store.save();
        storesUpdated++;
      }

      // 3. Seed at least 11 products for this store
      const storeProductsList = getProductsForStoreIndex(sIdx);
      const productIds = [];

      for (const prodData of storeProductsList) {
        let product = await Product.findOne({
          store: store._id,
          name: prodData.name,
        });

        const reorderLevel = Math.max(3, Math.floor(prodData.stock * 0.25));

        if (!product) {
          product = new Product({
            ...prodData,
            store: store._id,
            availableStock: prodData.stock,
            reservedStock: 0,
            soldStock: Math.floor(Math.random() * 30) + 5,
            reorderLevel,
            available: true,
          });
          await product.save();
          productsCreated++;
        } else {
          product.price = prodData.price;
          product.description = prodData.description;
          product.category = prodData.category;
          product.unit = prodData.unit;
          product.brand = prodData.brand;
          product.image = prodData.image;
          product.stock = prodData.stock;
          product.availableStock = prodData.stock;
          product.available = true;
          await product.save();
          productsUpdated++;
        }
        productIds.push(product._id);
      }

      // Sync store.products array with Product ObjectIds
      store.products = productIds;
      await store.save();

      console.log(`[STORE ${sIdx + 1}/20] "${store.name}" -> ${productIds.length} products synced.`);
    }

    // 4. Seed Multi-Role System Users (Admin, Delivery Partners, Verified Customers)
    console.log("\n[USERS] Verifying platform roles...");
    
    // Admin
    let adminUser = await User.findOne({ email: "admin@kiranawala.demo" });
    if (!adminUser) {
      adminUser = new User({
        username: "admin_super",
        email: "admin@kiranawala.demo",
        password: demoPassword,
        role: "admin",
        phone: "+91 99000 00001",
        city: "Bengaluru",
      });
      await adminUser.save();
    }

    // Delivery Partners
    let runner1 = await User.findOne({ email: "runner_rahul@kiranawala.demo" });
    if (!runner1) {
      runner1 = new User({
        username: "runner_rahul",
        email: "runner_rahul@kiranawala.demo",
        password: demoPassword,
        role: "delivery-partner",
        phone: "+91 98888 11111",
        city: "Bengaluru",
      });
      await runner1.save();
    }

    // Customers
    let customer1 = await User.findOne({ email: "customer@kiranawala.demo" });
    if (!customer1) {
      customer1 = new User({
        username: "demo_customer",
        email: "customer@kiranawala.demo",
        password: demoPassword,
        role: "customer",
        phone: "+91 97777 33333",
        address: "Flat 402, Green Glen Layout, Bellandur",
        city: "Bengaluru",
      });
      await customer1.save();
    }

    // 5. Seed Promotional Coupons
    console.log("[COUPONS] Verifying promotional coupons...");
    const sampleCoupons = [
      {
        code: "WELCOME100",
        description: "₹100 flat discount on your first neighborhood order above ₹499",
        discountType: "fixed",
        discountValue: 100,
        minOrderValue: 499,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        code: "KIRANA50",
        description: "₹50 instant savings on orders above ₹299",
        discountType: "fixed",
        discountValue: 50,
        minOrderValue: 299,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const coup of sampleCoupons) {
      await Coupon.findOneAndUpdate({ code: coup.code }, coup, { upsert: true });
    }

    // 6. Verification Queries
    const totalStores = await Store.countDocuments({});
    const totalProducts = await Product.countDocuments({});
    const storesWithImages = await Store.countDocuments({ image: { $exists: true, $ne: "" } });
    const productsWithImages = await Product.countDocuments({ image: { $exists: true, $ne: "" } });
    const productsWithValidPrice = await Product.countDocuments({ price: { $gt: 0 } });
    const productsWithStock = await Product.countDocuments({ stock: { $gt: 0 } });

    // Check sample store products count
    const firstStore = await Store.findOne({}).populate("products");
    const sampleStoreProductCount = firstStore && firstStore.products ? firstStore.products.length : 0;

    console.log("\n==============================================");
    console.log("FINAL REPORT — SEEDING SUMMARY REPORT");
    console.log("==============================================");
    console.log(`Stores Created: ${storesCreated}`);
    console.log(`Stores Updated: ${storesUpdated}`);
    console.log(`Total Stores: ${totalStores}`);
    console.log(`Products Created: ${productsCreated}`);
    console.log(`Products Updated: ${productsUpdated}`);
    console.log(`Total Products: ${totalProducts}`);
    console.log("----------------------------------------------");
    console.log(`Stores with valid images: ${storesWithImages} / ${totalStores}`);
    console.log(`Products with valid images: ${productsWithImages} / ${totalProducts}`);
    console.log(`Products with valid price > 0: ${productsWithValidPrice} / ${totalProducts}`);
    console.log(`Products with stock > 0: ${productsWithStock} / ${totalProducts}`);
    console.log("----------------------------------------------");
    console.log(`Sample Store (${firstStore?.name}): ${sampleStoreProductCount} products linked`);
    console.log("==============================================\n");

  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    // Only close the connection when run as standalone script
    if (closeConnection && require.main === module) {
      await mongoose.connection.close();
      console.log("Database connection closed.");
    }
  }
}

// Execute if run directly
if (require.main === module) {
  seedData({ closeConnection: true });
}

module.exports = { seedData };

