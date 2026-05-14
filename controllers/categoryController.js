const Category = require('../models/category');

async function createCategory(req, res) {
    try {
        const { categoryName, imgUrl } = req.body;
    
        const existing = await Category.findOne({ where: { categoryName } });
        if (existing) {
          return res.status(400).json({ error: 'Category name already exists' });
        }
    
        const category = await Category.create({ categoryName, imgUrl });
        res.status(201).json({ message: 'Category created', category });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
}
async function getAllCategory(req, res) {
    try {
      const {count,rows} = await Category.findAndCountAll();
    
      res.status(200).json({
        message: 'Category list',
        totalCount: count,
          rows,
      });
    } catch (error) {
      console.log(error,'error')

      res.status(500).json({ message: 'Error fetching category', error });
    }
}
  
  async function getCategoryById(req, res) {
    try {
      const category = await Category.findByPk(req.params.id);
      if (!category) return res.status(404).json({ message: 'category not found' });
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching category', error });
    }
  }
  
  async function updateCategory(req, res) {
    try {
      const [updated] = await Category.update(req.body, {
        where: { id: req.params.id },
      });
      if (!updated) return res.status(404).json({ message: 'Category not found' });
      const updatedCategory = await Product.findByPk(req.params.id);
      res.json(updatedCategory);
    } catch (error) {
      res.status(400).json({ message: 'Error updating category', error });
    }
  }
  
  async function deleteCategory(req, res) {
    try {
      const deleted = await Category.destroy({ where: { id: req.params.id } });
      if (!deleted) return res.status(404).json({ message: 'Category not found' });
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting Category', error });
    }
  }
module.exports={
    createCategory,
    deleteCategory,
    updateCategory,
    getCategoryById,
    getAllCategory
}