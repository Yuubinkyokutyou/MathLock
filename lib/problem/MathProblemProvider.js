class MathProblemProvider extends ProblemProvider {
  constructor() {
    super();
  }

  generateProblem(config) {
    const { difficulty, operations } = config;
    const enabledOperations = this.getEnabledOperations(operations);
    
    if (enabledOperations.length === 0) {
      throw new Error('At least one operation must be enabled');
    }
    
    const operation = enabledOperations[Math.floor(Math.random() * enabledOperations.length)];
    const range = this.getRangeByDifficulty(difficulty);
    
    let num1, num2, answer;
    
    switch (operation) {
      case 'addition':
        num1 = this.getRandomNumber(range.min, range.max);
        num2 = this.getRandomNumber(range.min, range.max);
        answer = num1 + num2;
        return {
          question: `${num1} + ${num2} = ?`,
          answer: answer,
          operation: 'addition'
        };
        
      case 'subtraction':
        num1 = this.getRandomNumber(range.min, range.max);
        num2 = this.getRandomNumber(range.min, Math.min(num1, range.max));
        answer = num1 - num2;
        return {
          question: `${num1} - ${num2} = ?`,
          answer: answer,
          operation: 'subtraction'
        };
        
      case 'multiplication':
        const multRange = this.getMultiplicationRange(difficulty);
        num1 = this.getRandomNumber(multRange.min, multRange.max);
        num2 = this.getRandomNumber(multRange.min, multRange.max);
        answer = num1 * num2;
        return {
          question: `${num1} × ${num2} = ?`,
          answer: answer,
          operation: 'multiplication'
        };
        
      case 'division':
        const divRange = this.getDivisionRange(difficulty);
        num2 = this.getRandomNumber(divRange.min, divRange.max);
        answer = this.getRandomNumber(divRange.min, divRange.max);
        num1 = num2 * answer;
        return {
          question: `${num1} ÷ ${num2} = ?`,
          answer: answer,
          operation: 'division'
        };
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
  
  validateAnswer(problem, userAnswer) {
    const parsedAnswer = parseInt(userAnswer, 10);
    if (isNaN(parsedAnswer)) {
      return false;
    }
    return problem.answer === parsedAnswer;
  }
  
  formatQuestion(problem) {
    return problem.question;
  }
  
  getEnabledOperations(operations) {
    const enabled = [];
    if (operations.addition) enabled.push('addition');
    if (operations.subtraction) enabled.push('subtraction');
    if (operations.multiplication) enabled.push('multiplication');
    if (operations.division) enabled.push('division');
    return enabled;
  }
  
  getRangeByDifficulty(difficulty) {
    switch (difficulty) {
      case 1:
        return { min: 1, max: 9 };
      case 2:
        return { min: 10, max: 99 };
      case 3:
        return { min: 100, max: 999 };
      default:
        return { min: 1, max: 9 };
    }
  }
  
  getMultiplicationRange(difficulty) {
    switch (difficulty) {
      case 1:
        return { min: 1, max: 9 };
      case 2:
        return { min: 2, max: 20 };
      case 3:
        return { min: 10, max: 50 };
      default:
        return { min: 1, max: 9 };
    }
  }
  
  getDivisionRange(difficulty) {
    switch (difficulty) {
      case 1:
        return { min: 1, max: 9 };
      case 2:
        return { min: 2, max: 15 };
      case 3:
        return { min: 5, max: 25 };
      default:
        return { min: 1, max: 9 };
    }
  }
  
  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathProblemProvider;
}