const slugify = require('slugify');

class SKUGenerator {
  constructor() {
    this.prefixes = {
      'Clothing': 'CLT',
      'Electronics': 'ELE',
      'Home': 'HOM',
      'Sports': 'SPT',
      'Books': 'BOK',
      'Toys': 'TOY',
      'Default': 'PRD'
    };
  }

  generateProductSKU(product) {
    const categoryPrefix = this.prefixes[product.category] || this.prefixes.Default;
    const brandPrefix = this.generateBrandPrefix(product.brand);
    const namePrefix = this.generateNamePrefix(product.name);
    
    return `${categoryPrefix}-${brandPrefix}-${namePrefix}-${Date.now().toString().slice(-4)}`.toUpperCase();
  }

  generateVariationSKU(product, variation) {
    const baseSKU = this.generateProductSKU(product);
    const attributeCodes = variation.attributes.map(attr => {
      const attrCode = this.generateAttributeCode(attr.name, attr.value);
      return attrCode;
    });
    
    return `${baseSKU}-${attributeCodes.join('-')}`.toUpperCase();
  }

  generateBrandPrefix(brand) {
    return slugify(brand, { 
      replacement: '', 
      remove: /[*+~.()'"!:@]/g,
      lower: true 
    }).substring(0, 3).toUpperCase();
  }

  generateNamePrefix(name) {
    const words = name.split(' ');
    if (words.length >= 2) {
      return words.slice(0, 2).map(word => word.substring(0, 2)).join('').toUpperCase();
    }
    return name.substring(0, 4).toUpperCase();
  }

  generateAttributeCode(attributeName, attributeValue) {
    const nameCode = attributeName.substring(0, 2).toUpperCase();
    let valueCode;
    
    switch (attributeName.toLowerCase()) {
      case 'color':
        valueCode = this.getColorCode(attributeValue);
        break;
      case 'size':
        valueCode = this.getSizeCode(attributeValue);
        break;
      default:
        valueCode = slugify(attributeValue, { 
          replacement: '', 
          remove: /[*+~.()'"!:@]/g,
          lower: true 
        }).substring(0, 3).toUpperCase();
    }
    
    return `${nameCode}${valueCode}`;
  }

  getColorCode(color) {
    const colorMap = {
      'red': 'RD', 'blue': 'BL', 'green': 'GR', 'black': 'BK', 'white': 'WT',
      'yellow': 'YL', 'orange': 'OR', 'purple': 'PR', 'pink': 'PK', 'brown': 'BR',
      'gray': 'GY', 'grey': 'GY', 'silver': 'SV', 'gold': 'GD'
    };
    
    return colorMap[color.toLowerCase()] || color.substring(0, 2).toUpperCase();
  }

  getSizeCode(size) {
    const sizeMap = {
      'xs': 'XS', 's': 'SM', 'm': 'MD', 'l': 'LG', 'xl': 'XL',
      'xxl': 'XX', '2xl': '2X', '3xl': '3X', '4xl': '4X', '5xl': '5X'
    };
    
    return sizeMap[size.toLowerCase()] || size.toUpperCase();
  }

  generateUniqueSKU(existingSKUs = []) {
    let sku;
    let attempts = 0;
    const maxAttempts = 1000;
    
    do {
      sku = `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      attempts++;
    } while (existingSKUs.includes(sku) && attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique SKU after maximum attempts');
    }
    
    return sku;
  }
}

module.exports = new SKUGenerator();