const {
  PracticeTest,
  PracticeTestSection,
  TestQuestion,
  Question,
  Category,
  SubCategory,
  QuestionOption,
  Subject,
} = require("../models");

async function replaceTestQuestions(ptId, questionIds, sectionId = null) {
  const mappings = questionIds.map((question_id, index) => ({
    pt_id: ptId,
    question_id: Number(question_id),
    section_id: sectionId,
    question_order: index + 1,
  }));
  if (mappings.length) {
    await TestQuestion.bulkCreate(mappings);
  }
}

async function saveSectionsForTest(ptId, sections = []) {
  await PracticeTestSection.destroy({ where: { pt_id: ptId } });
  await TestQuestion.destroy({ where: { pt_id: ptId } });

  let globalOrder = 0;
  const createdSections = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const questionIds = Array.isArray(section.question_ids)
      ? section.question_ids
      : [];
    const name =
      section.name ||
      (section.subject_id
        ? (await Subject.findByPk(section.subject_id))?.name
        : null) ||
      `Section ${i + 1}`;

    const row = await PracticeTestSection.create({
      pt_id: ptId,
      subject_id: section.subject_id ? Number(section.subject_id) : null,
      name,
      section_order: Number(section.section_order) || i + 1,
      question_count: questionIds.length,
    });

    const mappings = questionIds.map((question_id) => {
      globalOrder += 1;
      return {
        pt_id: ptId,
        question_id: Number(question_id),
        section_id: row.id,
        question_order: globalOrder,
      };
    });

    if (mappings.length) {
      await TestQuestion.bulkCreate(mappings);
    }

    createdSections.push(row);
  }

  return createdSections;
}

function flattenQuestionIdsFromSections(sections = []) {
  return sections.flatMap((s) =>
    Array.isArray(s.question_ids) ? s.question_ids.map(Number) : []
  );
}

// =============================
// Create Practice Test
// =============================
exports.createPracticeTest = async (req, res) => {
  try {
    const {
      question_ids = [],
      sections = [],
      is_sectional,
      ...testData
    } = req.body;

    if (!testData.category_id) {
      return res.status(400).json({
        success: false,
        message: "category_id is required",
      });
    }

    if (!testData.sub_category_id) {
      return res.status(400).json({
        success: false,
        message:
          "sub_category_id is required so mobile users can see this test under a subcategory",
      });
    }

    const useSections = Boolean(is_sectional) || (Array.isArray(sections) && sections.length > 0);
    const flatIds = useSections
      ? flattenQuestionIdsFromSections(sections)
      : question_ids.map(Number).filter(Boolean);

    if (!flatIds.length) {
      return res.status(400).json({
        success: false,
        message: useSections
          ? "Each section needs question_ids"
          : "question_ids are required",
      });
    }

    if (useSections) {
      for (const section of sections) {
        if (!Array.isArray(section.question_ids) || !section.question_ids.length) {
          return res.status(400).json({
            success: false,
            message: "Each section must include at least one question",
          });
        }
      }
    }

    const practiceTest = await PracticeTest.create({
      ...testData,
      is_sectional: useSections,
      total_questions: flatIds.length,
    });

    if (useSections) {
      await saveSectionsForTest(practiceTest.id, sections);
    } else {
      await replaceTestQuestions(practiceTest.id, flatIds, null);
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
        { model: Category, as: "category" },
        { model: SubCategory, as: "subCategory" },
        {
          model: Question,
          as: "questions",
          attributes: ["id", "subject_id"],
          through: { attributes: ["section_id", "question_order"] },
        },
        {
          model: PracticeTestSection,
          as: "sections",
          include: [{ model: Subject, as: "subject", attributes: ["id", "name", "code"] }],
        },
      ],
      order: [
        ["id", "DESC"],
        [{ model: PracticeTestSection, as: "sections" }, "section_order", "ASC"],
      ],
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
        { model: Category, as: "category" },
        { model: SubCategory, as: "subCategory" },
        {
          model: Question,
          as: "questions",
          through: { attributes: ["section_id", "question_order"] },
          include: [
            {
              model: QuestionOption,
              as: "options",
              attributes: { exclude: ["is_correct", "createdAt", "updatedAt"] },
            },
            { model: Subject, as: "subject", attributes: ["id", "name", "code"] },
          ],
        },
        {
          model: PracticeTestSection,
          as: "sections",
          include: [{ model: Subject, as: "subject", attributes: ["id", "name", "code"] }],
        },
      ],
      order: [[{ model: PracticeTestSection, as: "sections" }, "section_order", "ASC"]],
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
      sections = [],
      is_sectional,
      ...testData
    } = req.body;

    const practiceTest = await PracticeTest.findByPk(req.params.id);

    if (!practiceTest) {
      return res.status(404).json({
        success: false,
        message: "Practice Test not found.",
      });
    }

    const hasSectionsPayload = Array.isArray(sections) && sections.length > 0;
    const hasFlatQuestions = Array.isArray(question_ids) && question_ids.length > 0;
    const useSections =
      hasSectionsPayload ||
      (is_sectional === true && hasSectionsPayload) ||
      (is_sectional === false ? false : practiceTest.is_sectional && hasSectionsPayload);

    if (hasSectionsPayload || hasFlatQuestions || is_sectional !== undefined) {
      if (hasSectionsPayload) {
        const flatIds = flattenQuestionIdsFromSections(sections);
        await practiceTest.update({
          ...testData,
          is_sectional: true,
          total_questions: flatIds.length,
        });
        await saveSectionsForTest(practiceTest.id, sections);
      } else if (hasFlatQuestions) {
        await PracticeTestSection.destroy({ where: { pt_id: practiceTest.id } });
        await TestQuestion.destroy({ where: { pt_id: practiceTest.id } });
        await practiceTest.update({
          ...testData,
          is_sectional: false,
          total_questions: question_ids.length,
        });
        await replaceTestQuestions(practiceTest.id, question_ids, null);
      } else {
        await practiceTest.update(testData);
      }
    } else {
      await practiceTest.update(testData);
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
    const practiceTest = await PracticeTest.findByPk(req.params.id);

    if (!practiceTest) {
      return res.status(404).json({
        success: false,
        message: "Practice Test not found.",
      });
    }

    await PracticeTestSection.destroy({ where: { pt_id: practiceTest.id } });
    await TestQuestion.destroy({ where: { pt_id: practiceTest.id } });
    await practiceTest.destroy();

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
