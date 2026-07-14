const {
  PracticeTest,
  TestQuestion,
  Question,
  Category,
  SubCategory,
} = require("../models");


// =============================
// Create Practice Test
// =============================
exports.createPracticeTest = async (req, res) => {
  try {
    const {
      question_ids = [],
      ...testData
    } = req.body;

    const practiceTest = await PracticeTest.create(testData);

    if (question_ids.length) {
      const mappings = question_ids.map((question_id) => ({
        pt_id: practiceTest.id,
        question_id,
      }));

      await TestQuestion.bulkCreate(mappings);
    }

    return res.status(201).json({
      success: true,
      message: "Practice Test created successfully.",
      data: practiceTest,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =============================
// Get All Practice Tests
// =============================
exports.getPracticeTests = async (req, res) => {
  try {
    const tests = await PracticeTest.findAll({
      include: [
        {
          model: Category,
          as: "category",
        },
        {
          model: SubCategory,
          as: "subCategory",
        },
        {
          model: Question,
          as: "questions",
          through: {
            attributes: [],
          },
        },
      ],
      order: [["id", "DESC"]],
    });

    return res.json({
      success: true,
      data: tests,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =============================
// Get By Id
// =============================
exports.getPracticeTestById = async (req, res) => {
  try {
    const test = await PracticeTest.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: "category",
        },
        {
          model: SubCategory,
          as: "subCategory",
        },
        {
          model: Question,
          as: "questions",
          through: {
            attributes: [],
          },
        },
      ],
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Practice Test not found.",
      });
    }

    return res.json({
      success: true,
      data: test,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =============================
// Update Practice Test
// =============================
exports.updatePracticeTest = async (req, res) => {
  try {
    const {
      question_ids = [],
      ...testData
    } = req.body;

    const practiceTest = await PracticeTest.findByPk(req.params.id);

    if (!practiceTest) {
      return res.status(404).json({
        success: false,
        message: "Practice Test not found.",
      });
    }

    await practiceTest.update(testData);

    if (question_ids.length) {
      await TestQuestion.destroy({
        where: {
          pt_id: practiceTest.id,
        },
      });

      const mappings = question_ids.map((question_id) => ({
        pt_id: practiceTest.id,
        question_id,
      }));

      await TestQuestion.bulkCreate(mappings);
    }

    return res.json({
      success: true,
      message: "Practice Test updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// =============================
// Delete Practice Test
// =============================
exports.deletePracticeTest = async (req, res) => {
  try {

    await TestQuestion.destroy({
      where: {
        pt_id: req.params.id,
      },
    });

    await PracticeTest.destroy({
      where: {
        id: req.params.id,
      },
    });

    return res.json({
      success: true,
      message: "Practice Test deleted successfully.",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};