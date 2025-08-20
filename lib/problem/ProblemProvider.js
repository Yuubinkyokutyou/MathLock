class ProblemProvider {
  generateProblem(config) {
    throw new Error('generateProblem must be implemented by subclass');
  }
  
  validateAnswer(problem, userAnswer) {
    throw new Error('validateAnswer must be implemented by subclass');
  }
  
  formatQuestion(problem) {
    throw new Error('formatQuestion must be implemented by subclass');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProblemProvider;
}