const sampleProducts = [
  {
    name: "Classic Cotton T-Shirt",
    description: "Comfortable cotton t-shirt available in multiple colors and sizes",
    category: "Clothing",
    brand: "BasicWear",
    basePrice: 19.99,
    attributes: [
      {
        name: "color",
        displayName: "Color",
        type: "color",
        values: [
          { value: "red", displayValue: "Red", image: "/uploads/products/red-shirt.jpg" },
          { value: "blue", displayValue: "Blue", image: "/uploads/products/blue-shirt.jpg" },
          { value: "black", displayValue: "Black", image: "/uploads/products/black-shirt.jpg" },
          { value: "white", displayValue: "White", image: "/uploads/products/white-shirt.jpg" }
        ]
      },
      {
        name: "size",
        displayName: "Size",
        type: "text",
        values: [
          { value: "S", displayValue: "Small" },
          { value: "M", displayValue: "Medium" },
          { value: "L", displayValue: "Large" },
          { value: "XL", displayValue: "Extra Large" }
        ]
      }
    ],
    variations: [
      {
        sku: "CLT-BAS-CLT-RED-S-2024",
        price: 19.99,
        stock: 50,
        attributes: [
          { name: "color", value: "red" },
          { name: "size", value: "S" }
        ],
        images: ["/uploads/variations/tshirt-red-s.jpg"]
      },
      {
        sku: "CLT-BAS-CLT-RED-M-2024",
        price: 19.99,
        stock: 75,
        attributes: [
          { name: "color", value: "red" },
          { name: "size", value: "M" }
        ],
        images: ["/uploads/variations/tshirt-red-m.jpg"]
      },
      {
        sku: "CLT-BAS-CLT-BLUE-L-2024",
        price: 19.99,
        stock: 30,
        attributes: [
          { name: "color", value: "blue" },
          { name: "size", value: "L" }
        ],
        images: ["/uploads/variations/tshirt-blue-l.jpg"]
      },
      {
        sku: "CLT-BAS-CLT-BLACK-XL-2024",
        price: 21.99,
        stock: 20,
        attributes: [
          { name: "color", value: "black" },
          { name: "size", value: "XL" }
        ],
        images: ["/uploads/variations/tshirt-black-xl.jpg"]
      }
    ],
    images: ["/uploads/products/tshirt-main.jpg"],
    tags: ["cotton", "t-shirt", "basic", "casual"]
  },
  {
    name: "Wireless Bluetooth Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    category: "Electronics",
    brand: "SoundTech",
    basePrice: 149.99,
    attributes: [
      {
        name: "color",
        displayName: "Color",
        type: "color",
        values: [
          { value: "black", displayValue: "Black", image: "/uploads/products/headphones-black.jpg" },
          { value: "silver", displayValue: "Silver", image: "/uploads/products/headphones-silver.jpg" },
          { value: "blue", displayValue: "Blue", image: "/uploads/products/headphones-blue.jpg" }
        ]
      },
      {
        name: "battery",
        displayName: "Battery Life",
        type: "text",
        values: [
          { value: "20h", displayValue: "20 Hours" },
          { value: "30h", displayValue: "30 Hours" }
        ]
      }
    ],
    variations: [
      {
        sku: "ELE-SOU-WBH-BLK-20H-2024",
        price: 149.99,
        stock: 25,
        attributes: [
          { name: "color", value: "black" },
          { name: "battery", value: "20h" }
        ],
        images: ["/uploads/variations/headphones-black-20h.jpg"]
      },
      {
        sku: "ELE-SOU-WBH-SLV-30H-2024",
        price: 179.99,
        stock: 15,
        attributes: [
          { name: "color", value: "silver" },
          { name: "battery", value: "30h" }
        ],
        images: ["/uploads/variations/headphones-silver-30h.jpg"]
      },
      {
        sku: "ELE-SOU-WBH-BLU-20H-2024",
        price: 149.99,
        stock: 10,
        attributes: [
          { name: "color", value: "blue" },
          { name: "battery", value: "20h" }
        ],
        images: ["/uploads/variations/headphones-blue-20h.jpg"]
      }
    ],
    images: ["/uploads/products/headphones-main.jpg"],
    tags: ["wireless", "bluetooth", "headphones", "noise-cancellation"]
  }
];

module.exports = sampleProducts;