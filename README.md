# BJCP Beer Style Guidelines

This package provides a JSON version of the [Beer Judge Certification Program](https://www.bjcp.org) style guidelines.

### Content

Each version is stored in a dedicated directory.  
New versions / updates will be added as soon as delivered.

In order to ease data manipulation, some custom columns were added in addition to BJCP informations:

+ **categories.json**:
    + **slug:** a unique slug based on category's code and name.
+ **styles.json**:
    + **slug:** a unique slug based on style's code and name.
    + **category_code:** category's code.
    + **category_slug:** category's slug.

Slugs were generated using [https://www.npmjs.com/package/slugify]():  

```javascript
category.slug = slugify(`${category.code}-${category.name}`, {lower: true});
style.slug = slugify(`${style.code}-${style.name}`, {lower: true});
```

### Contribution

Any contribution is welcomed and would be highly appreciated.  
Please feel free to make a merge request, or to [open an issue](https://github.com/bgaze/bjcp-guidelines/issues/new).
