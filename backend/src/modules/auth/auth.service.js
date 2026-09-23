const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const AppError = require('../../utils/AppError');

async function registerEmployee(data) {
  // Extract user details from the payload
  const { name, email, password, department, office_id, role } = data;

  // Validate presence of essential fields
  if (!name || !email || !password || !office_id) {
    throw new AppError('Missing required fields: name, email, password, office_id', 400);
  }

  const existing = await prisma.employee.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 400);
  }

  // Securely hash the user's password before storing
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the new employee record
  const employee = await prisma.employee.create({
    data: {
      name,
      email,
      password: hashedPassword,
      department,
      role: role || 'Host',
      office_id
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      office_id: true
      // Omit password from return
    }
  });

  return employee;
}

async function loginEmployee(email, password) {
  // Ensure both credentials are provided
  if (!email || !password) {
    throw new AppError('Missing email or password', 401);
  }

  // Find the employee by their unique email
  const employee = await prisma.employee.findUnique({ where: { email } });
  if (!employee) {
    throw new AppError('Invalid credentials', 401);
  }

  // Compare provided password with stored hash
  const isMatch = await bcrypt.compare(password, employee.password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  return employee;
}

module.exports = {
  registerEmployee,
  loginEmployee
};
